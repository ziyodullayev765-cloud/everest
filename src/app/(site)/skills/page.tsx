import type { Metadata } from "next";
import { SkillGroups } from "@/components/site/skill-list";
import { EmptyState, PageHeader } from "@/components/site/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { copy } from "@/lib/copy";
import { getSkills } from "@/lib/data/public";

export const metadata: Metadata = {
  title: copy.skills.title,
  description: copy.skills.lead,
  alternates: { canonical: "/skills" },
};

export default async function SkillsPage() {
  const skills = await getSkills();
  return (
    <>
      <PageHeader title={copy.skills.title} lead={copy.skills.lead} />
      <section className="container-x">
        {skills.length ? (
          <Reveal>
            <SkillGroups skills={skills} />
          </Reveal>
        ) : (
          <EmptyState>{copy.skills.empty}</EmptyState>
        )}
      </section>
    </>
  );
}
