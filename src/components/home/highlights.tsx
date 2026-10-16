import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EdSection } from "@/components/site/ed-section";
import { GlowCard } from "@/components/site/glow-card";
import { getCopy } from "@/lib/i18n/server";
import type { Achievement, Stat } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HomeHeading } from "./section-heading";

/** Key milestones (featured achievements) as large stat cards, plus any numeric stats. */
export async function Highlights({
  items,
  stats,
  heading = true,
}: {
  items: Achievement[];
  stats: Stat[];
  /** Off on the /highlights page, whose page header already names the section. */
  heading?: boolean;
}) {
  const copy = await getCopy();
  if (!items.length && !stats.length) return null;
  return (
    <EdSection
      id={heading ? "highlights" : undefined}
      className={cn("mx-auto w-[min(1200px,calc(100%-2rem))]", heading && "py-14 sm:py-24")}
    >
      {heading && (
        <HomeHeading eyebrow={copy.homePage.milestones} title={copy.sections.recentAchievements}>
          <Link href="/achievements" className="ed-button">
            {copy.sections.allAchievements}
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </HomeHeading>
      )}
      {items.length > 0 && (
        <div data-stagger className={cn("grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4", heading && "mt-8 sm:mt-12")}>
          {items.map((a, i) => (
            <GlowCard key={a.id} className="flex min-h-40 flex-col justify-between gap-6 p-4 sm:min-h-56 sm:p-7">
              <span className="text-gold font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="text-[1.15rem] leading-tight sm:text-[1.7rem]">{a.title}</h3>
                {(a.description || a.organization) && (
                  <p className="mt-2 text-xs leading-relaxed text-[var(--fg-secondary)] sm:mt-3 sm:text-sm">
                    {a.description || a.organization}
                  </p>
                )}
              </div>
            </GlowCard>
          ))}
        </div>
      )}
      {stats.length > 0 && (
        <div data-stagger className="border-line mt-12 grid grid-cols-2 gap-8 border-y py-10 md:grid-cols-4">
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
