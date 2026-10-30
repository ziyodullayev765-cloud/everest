"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { setMarkAction } from "@/app/actions/staff";
import { MARKS, MARK_AREAS, MARK_STYLE, type MarkArea } from "@/lib/marks";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { tr } from "@/lib/i18n/tr";

type Row = { id: string; name: string; marks: Record<string, number> };

const shift = (day: string, n: number) => {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Day picker that keeps the other query params (group, skill). */
export function MarksDay({ day, today }: { day: string; today: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const go = (d: string) => {
    const n = new URLSearchParams(sp.toString());
    if (d && d <= today) n.set("day", d);
    else n.delete("day");
    router.replace(`${path}?${n.toString()}`, { scroll: false });
  };
  const btn = "grid size-10 shrink-0 place-items-center rounded-xl border-2 border-border bg-surface hover:bg-surface-2 disabled:opacity-40";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => go(shift(day, -1))} aria-label={tr("Oldingi kun")}><ChevronLeft className="size-4" /></button>
      <input
        type="date"
        value={day}
        max={today}
        onChange={(e) => go(e.target.value)}
        aria-label={tr("Dars kuni")}
        className="h-10 min-w-0 flex-1 rounded-xl border-2 border-border bg-surface px-3 text-[14px] font-bold sm:flex-none"
      />
      <button type="button" className={btn} disabled={day >= today} onClick={() => go(shift(day, 1))} aria-label={tr("Keyingi kun")}><ChevronRight className="size-4" /></button>
      {day !== today ? <button type="button" onClick={() => go(today)} className="text-[13px] font-bold text-primary">{tr("Bugun")}</button> : null}
    </div>
  );
}

/** One row per student with 3 / 4 / 5 buttons for the chosen skill. Tapping the current mark clears it. */
export function MarksBoard({ classId, day, area, rows }: { classId: string; day: string; area: MarkArea; rows: Row[] }) {
  const router = useRouter();
  const [local, setLocal] = useState<Record<string, number | null>>({});
  const current = (r: Row) => (r.id in local ? local[r.id] : (r.marks[area] ?? null));

  const set = (r: Row, mark: number) => {
    const prev = current(r);
    const next = prev === mark ? null : mark;
    setLocal((l) => ({ ...l, [r.id]: next }));
    // Not inside a transition: a pending one would hold back switching to another skill.
    void setMarkAction({ classId, studentId: r.id, area, day, mark: next }).then(
      (res) => {
        if (!res.ok) {
          setLocal((l) => ({ ...l, [r.id]: prev }));
          toast.error(res.error);
        } else router.refresh();
      },
      () => {
        setLocal((l) => ({ ...l, [r.id]: prev }));
        toast.error(tr("Internet aloqasi yo‘q. Qayta urinib ko‘ring."));
      },
    );
  };

  const given = rows.filter((r) => current(r) != null).length;
  return (
    <div>
      <p className="mb-3 text-[13px] text-muted">{tr("{0} / {1} o‘quvchi baholandi", given, rows.length)}</p>
      <ul className="space-y-2">
        {rows.map((r, i) => {
          const m = current(r);
          const others = MARK_AREAS.filter((a) => a.key !== area && r.marks[a.key]);
          return (
            <li key={r.id} className="flex flex-col gap-2 rounded-2xl border-2 border-border bg-surface px-3 py-2.5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-bold"><span className="mr-1.5 text-muted tabular">{i + 1}.</span>{r.name}</div>
                {others.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {others.map((a) => (
                      <span key={a.key} className={cn("rounded-md border px-1.5 text-[11px] font-bold", MARK_STYLE[r.marks[a.key]])}>{a.label} {r.marks[a.key]}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="grid shrink-0 grid-cols-3 gap-1.5" role="radiogroup" aria-label={tr("{0} uchun baho", r.name)}>
                {MARKS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={m === opt.value}
                    onClick={() => set(r, opt.value)}
                    className={cn(
                      "flex h-12 min-w-[84px] flex-col items-center justify-center rounded-xl border-2 leading-none font-black transition active:scale-95",
                      m === opt.value ? MARK_STYLE[opt.value] + " shadow-soft" : "border-border bg-surface text-text-2 hover:bg-surface-2",
                    )}
                  >
                    <span className="text-[18px] tabular">{opt.value}</span>
                    <span className="mt-0.5 text-[10.5px] font-bold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Skill tabs + the board. While the next skill is loading the current board is dimmed and can't be
 * tapped, so a quick tap never lands a mark on the skill being left.
 */
export function MarksTabs({ tabs, current, children }: { tabs: { key: string; label: string; href: string }[]; current: string; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState(current);
  const go = (t: { key: string; href: string }) => {
    if (t.key === current) return;
    setTarget(t.key);
    start(() => router.replace(t.href, { scroll: false }));
  };
  // If the switch hasn't finished after a few seconds, load the page normally instead of leaving the board dimmed.
  useEffect(() => {
    if (!pending) return;
    const href = tabs.find((t) => t.key === target)?.href;
    const t = setTimeout(() => href && window.location.assign(href), 6000);
    return () => clearTimeout(t);
  }, [pending, target, tabs]);
  const shown = pending ? target : current;
  return (
    <>
      <nav aria-label={tr("Yo‘nalishlar")} className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {tabs.map((a) => (
          <a
            key={a.key}
            href={a.href}
            onClick={(e) => {
              e.preventDefault();
              go(a);
            }}
            aria-current={a.key === shown ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border-2 px-4 py-1.5 text-[13.5px] font-extrabold transition",
              a.key === shown ? "border-primary bg-primary text-primary-fg shadow-[0_3px_0_0_var(--primary-shadow)]" : "border-border bg-surface text-text-2 hover:bg-surface-2",
            )}
          >
            {a.label}
          </a>
        ))}
      </nav>
      <div aria-busy={pending || undefined} className={cn("transition-opacity", pending && "pointer-events-none opacity-40")}>
        {children}
      </div>
    </>
  );
}
