"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { AchievementCard } from "./achievement-card";
import { Reveal } from "@/components/ui/reveal";
import { useCopy } from "@/components/i18n/provider";
import type { Achievement } from "@/lib/types";
import { cn, unique } from "@/lib/utils";

export function AchievementTimeline({ items }: { items: Achievement[] }) {
  const copy = useCopy();
  const [filter, setFilter] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);

  const facets = useMemo(() => unique(items.map((a) => (a.category ? `c:${a.category}` : `k:${a.kind}`))), [items]);

  const groups = useMemo(() => {
    const list = items
      .filter(
        (a) => !filter || (filter.startsWith("c:") ? a.category === filter.slice(2) : !a.category && a.kind === filter.slice(2)),
      )
      .sort((a, b) => {
        const da = a.achieved_on ?? "";
        const db = b.achieved_on ?? "";
        if (da === db) return a.sort_order - b.sort_order;
        if (!da) return 1;
        if (!db) return -1;
        return newestFirst ? db.localeCompare(da) : da.localeCompare(db);
      });
    const map = new Map<string, Achievement[]>();
    for (const a of list) {
      const year = a.achieved_on?.slice(0, 4) ?? "—";
      map.set(year, [...(map.get(year) ?? []), a]);
    }
    return Array.from(map.entries());
  }, [items, filter, newestFirst]);

  const label = (f: string) => (f.startsWith("c:") ? f.slice(2) : (copy.achievements.kinds[f.slice(2)] ?? f.slice(2)));
  const chip = (active: boolean) =>
    cn(
      "h-9 rounded-full px-4 text-sm transition-colors",
      active ? "bg-fg text-bg" : "border border-line text-muted hover:text-fg",
    );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          <button type="button" className={chip(!filter)} aria-pressed={!filter} onClick={() => setFilter("")}>
            {copy.projects.all}
          </button>
          {facets.map((f) => (
            <button key={f} type="button" className={chip(filter === f)} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {label(f)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setNewestFirst((v) => !v)}
          className="border-line text-muted hover:text-fg inline-flex h-9 items-center gap-2 self-start rounded-full border px-4 text-sm transition"
        >
          <ArrowDownUp className="size-4" aria-hidden />
          {newestFirst ? copy.achievements.newest : copy.achievements.oldest}
        </button>
      </div>

      <ol className="border-line relative mt-14 border-l pl-6 sm:ml-24 sm:pl-10">
        {groups.map(([year, list]) => (
          <li key={year} className="relative mb-14 last:mb-0">
            <div className="absolute top-1 -left-[31px] sm:-left-[47px]" aria-hidden>
              <span className="border-accent bg-bg block size-3.5 rounded-full border-2 shadow-[0_0_0_6px_var(--bg),0_0_24px_var(--accent)]" />
            </div>
            <h2 className="text-accent mb-6 font-mono text-sm tracking-[0.2em] sm:absolute sm:top-0 sm:-left-[8.5rem] sm:mb-0 sm:w-20 sm:text-right">
              {year}
            </h2>
            <ul className="grid gap-4">
              {list.map((a, i) => (
                <li key={a.id}>
                  <Reveal delay={Math.min(i, 4) * 0.05}>
                    <AchievementCard a={a} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
