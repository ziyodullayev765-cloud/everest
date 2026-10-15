import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EdSection } from "@/components/site/ed-section";
import { GlowCard } from "@/components/site/glow-card";
import { copy } from "@/lib/copy";
import type { Achievement, Stat } from "@/lib/types";
import { HomeHeading } from "./section-heading";

/** Key milestones (featured achievements) as large stat cards, plus any numeric stats. */
export function Highlights({ items, stats }: { items: Achievement[]; stats: Stat[] }) {
  if (!items.length && !stats.length) return null;
  return (
    <EdSection id="highlights" className="mx-auto w-[min(1200px,calc(100%-2rem))] py-24">
      <HomeHeading eyebrow="Milestones" title={copy.sections.recentAchievements}>
        <Link href="/achievements" className="ed-button">
          {copy.sections.allAchievements}
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </HomeHeading>
      {items.length > 0 && (
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((a, i) => (
            <GlowCard key={a.id} className="flex min-h-56 flex-col justify-between p-7">
              <span className="text-gold font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-[1.7rem] leading-tight">{a.title}</h3>
                {(a.description || a.organization) && (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--fg-secondary)]">{a.description || a.organization}</p>
                )}
              </div>
            </GlowCard>
          ))}
        </div>
      )}
      {stats.length > 0 && (
        <div className="border-line mt-12 grid grid-cols-2 gap-8 border-y py-10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.id} className="text-center">
              <span className="font-display text-gold block text-[2.6rem] leading-none font-semibold">{s.value}</span>
              <span className="mt-2 block text-sm text-[var(--fg-secondary)]">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </EdSection>
  );
}
