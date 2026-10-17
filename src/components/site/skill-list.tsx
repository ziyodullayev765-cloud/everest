import type { Skill } from "@/lib/types";
import { getCopy } from "@/lib/i18n/server";

/** Groups skills by category. Level bars only render when the admin set a level. */
export async function SkillGroups({ skills }: { skills: Skill[] }) {
  const copy = await getCopy();
  const groups = new Map<string, Skill[]>();
  for (const s of skills) {
    const key = s.category || copy.skills.other;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from(groups.entries()).map(([category, items]) => (
        <section
          key={category}
          className="bronze-border border-line bg-surface rounded-3xl border p-7 shadow-[var(--shadow)] transition-transform duration-300 hover:-translate-y-1"
          aria-labelledby={`skills-${category}`}
        >
          <h3 id={`skills-${category}`} className="text-[1.35rem]">
            {category}
          </h3>
          <ul className="mt-5 grid gap-4">
            {items.map((s) => (
              <li key={s.id}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium tracking-tight">{s.name}</span>
                  {(s.level_label || s.level !== null) && (
                    <span className="text-subtle text-xs">{s.level_label || `${s.level}%`}</span>
                  )}
                </div>
                {s.level !== null && (
                  <div
                    className="mt-2 h-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--fg)_8%,transparent)]"
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={s.level}
                    aria-label={s.name}
                  >
                    <div
                      className="from-accent/60 to-accent h-full rounded-full bg-gradient-to-r"
                      style={{ width: `${s.level}%` }}
                    />
                  </div>
                )}
                {s.description && <p className="text-muted mt-1.5 text-sm">{s.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
