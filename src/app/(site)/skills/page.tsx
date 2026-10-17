import type { Metadata } from "next";
import { SkillGroups } from "@/components/site/skill-list";
import { EmptyState, PageHeader } from "@/components/site/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { PageNext } from "@/components/site/page-next";
import { getCopy } from "@/lib/i18n/server";
import { getProjects, getSkills } from "@/lib/data/public";
import { SkillExplorer } from "@/components/site/skill-explorer";
import { unique } from "@/lib/utils";

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
  const [skills, projects] = await Promise.all([getSkills(), getProjects()]);
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
        <SkillExplorer
          skills={unique(skills.map((s) => s.name))}
          projects={projects.map((p) => ({
            slug: p.slug,
            title: p.title,
            summary: p.summary,
            tech: [...p.technologies, ...p.tags],
          }))}
          labels={{ title: copy.explorer.title, lead: copy.explorer.lead, count: copy.explorer.count }}
        />
      </section>
      <PageNext current="/skills" />
    </>
  );
}
