import type { Metadata } from "next";
import { AchievementTimeline } from "@/components/site/achievement-timeline";
import { EmptyState, PageHeader } from "@/components/site/section-heading";
import { copy } from "@/lib/copy";
import { getAchievements } from "@/lib/data/public";

export const metadata: Metadata = {
  title: copy.achievements.title,
  description: copy.achievements.lead,
  alternates: { canonical: "/achievements" },
};

export default async function AchievementsPage() {
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
