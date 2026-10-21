"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/form";

type F = { name: string; type?: "search"; placeholder?: string; label?: string; options?: [string, string][] };

/** URL-driven filters (shareable, back-button friendly). */
export function FilterBar({ fields }: { fields: F[] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const setParam = (k: string, v: string) => {
    const n = new URLSearchParams(sp.toString());
    if (v) n.set(k, v);
    else n.delete(k);
    router.replace(`${path}?${n.toString()}`, { scroll: false });
  };
  useEffect(() => {
    const t = setTimeout(() => {
      if ((sp.get("q") ?? "") !== q) setParam("q", q);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {fields.map((f) =>
        f.type === "search" ? (
          <div key={f.name} className="relative col-span-2 sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.placeholder} className="h-10 pl-9" aria-label={f.placeholder} />
          </div>
        ) : (
          <Select key={f.name} value={sp.get(f.name) ?? ""} onChange={(e) => setParam(f.name, e.target.value)} aria-label={f.label} className="h-10 sm:w-48">
            {f.options!.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        ),
      )}
    </div>
  );
}
