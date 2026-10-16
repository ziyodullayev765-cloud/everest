import { EdSection } from "@/components/site/ed-section";
import { getCopy } from "@/lib/i18n/server";
import type { Skill } from "@/lib/types";
import { HomeHeading } from "./section-heading";

/** Skills grouped by category; each card gets a bronze border that runs round it on hover. */
export async function Skills({ skills }: { skills: Skill[] }) {
  const copy = await getCopy();
  const groups = Object.entries(
    skills.reduce<Record<string, Skill[]>>((acc, s) => {
      (acc[s.category || copy.skills.other] ??= []).push(s);
      return acc;
    }, {}),
  );
  if (!groups.length) return null;
  return (
    <EdSection id="skills" className="mx-auto w-[min(1200px,calc(100%-2rem))] py-14 sm:py-24">
      <HomeHeading eyebrow={copy.homePage.capabilities} title={copy.skills.title} lead={copy.skills.lead} />
      <div data-stagger className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {groups.map(([group, items], i) => (
          <div
            key={group}
            className="bronze-border border-line bg-surface rounded-3xl border p-7 shadow-[var(--shadow)] transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[1.35rem]">{group}</h3>
              <span className="text-gold font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2">
              {items.map((s) => (
                <li
                  key={s.id}
                  className="border-line hover:border-line-strong hover:text-gold rounded-full border px-3.5 py-1.5 text-sm text-[var(--fg-secondary)] transition-colors"
                >
                  {s.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </EdSection>
  );
}
