import type { Metadata } from "next";
import { AchievementTimeline } from "@/components/site/achievement-timeline";
import { EmptyState, PageHeader } from "@/components/site/section-heading";
import { getCopy } from "@/lib/i18n/server";
import { getAchievements } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return {
    title: copy.achievements.title,
    description: copy.achievements.lead,
    alternates: { canonical: "/achievements" },
  };
}

export default async function AchievementsPage() {
  const copy = await getCopy();
  const items = await getAchievements();
  return (
    <>
      <PageHeader title={copy.achievements.title} lead={copy.achievements.lead} />
      <section className="container-x">
        {items.length ? <AchievementTimeline items={items} /> : <EmptyState>{copy.achievements.empty}</EmptyState>}
      </section>
    </>
  );
}
