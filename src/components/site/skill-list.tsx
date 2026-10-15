import type { Skill } from "@/lib/types";
import { copy } from "@/lib/copy";

/** Groups skills by category. Level bars only render when the admin set a level. */
export function SkillGroups({ skills }: { skills: Skill[] }) {
  const groups = new Map<string, Skill[]>();
  for (const s of skills) {
    const key = s.category || copy.skills.other;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {Array.from(groups.entries()).map(([category, items]) => (
        <section key={category} className="glass rounded-3xl p-6 sm:p-7" aria-labelledby={`skills-${category}`}>
          <h3 id={`skills-${category}`} className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
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
                    className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]"
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

export function SkillChips({ skills }: { skills: Skill[] }) {
  return (
    <ul className="flex flex-wrap gap-2.5">
      {skills.map((s) => (
        <li key={s.id} className="glass text-fg/90 hover:border-accent/50 rounded-full px-4 py-2 text-sm transition">
          {s.name}
        </li>
      ))}
    </ul>
  );
}
