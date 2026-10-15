import type { Metadata } from "next";
import { SkillGroups } from "@/components/site/skill-list";
import { EmptyState, PageHeader } from "@/components/site/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { PageNext } from "@/components/site/page-next";
import { getCopy } from "@/lib/i18n/server";
import { getSkills } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return {
    title: copy.skills.title,
    description: copy.skills.lead,
    alternates: { canonical: "/skills" },
  };
}

export default async function SkillsPage() {
  const copy = await getCopy();
  const skills = await getSkills();
  return (
    <>
      <PageHeader title={copy.skills.title} lead={copy.skills.lead} />
      <section className="mx-auto w-[min(1200px,calc(100%-2rem))]">
        {skills.length ? (
          <Reveal>
            <SkillGroups skills={skills} />
          </Reveal>
        ) : (
          <EmptyState>{copy.skills.empty}</EmptyState>
        )}
      </section>
      <PageNext current="/skills" />
    </>
  );
}
