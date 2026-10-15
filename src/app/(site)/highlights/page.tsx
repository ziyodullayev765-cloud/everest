import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Highlights } from "@/components/home/highlights";
import { PageNext } from "@/components/site/page-next";
import { EmptyState, PageHeader } from "@/components/site/section-heading";
import { getCopy } from "@/lib/i18n/server";
import { getAchievements, getStats } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return {
    title: copy.sections.recentAchievements,
    description: copy.homePage.highlightsLead,
    alternates: { canonical: "/highlights" },
  };
}

/** The milestones worth leading with: featured achievements plus the headline numbers. */
export default async function HighlightsPage() {
  const copy = await getCopy();
  const [achievements, stats] = await Promise.all([getAchievements(), getStats()]);
  const items = achievements.some((a) => a.featured) ? achievements.filter((a) => a.featured) : achievements;

  return (
    <>
      <PageHeader eyebrow={copy.homePage.milestones} title={copy.sections.recentAchievements} lead={copy.homePage.highlightsLead}>
        <Link href="/achievements" className="ed-button">
          {copy.sections.allAchievements}
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </PageHeader>
      {items.length || stats.length ? (
        <Highlights items={items} stats={stats} heading={false} />
      ) : (
        <div className="mx-auto w-[min(1200px,calc(100%-2rem))]">
          <EmptyState>{copy.achievements.empty}</EmptyState>
        </div>
      )}
      <PageNext current="/highlights" />
    </>
  );
}
