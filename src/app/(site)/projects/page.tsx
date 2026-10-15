import type { Metadata } from "next";
import { PageHeader } from "@/components/site/section-heading";
import { ProjectBrowser } from "@/components/site/project-browser";
import { PageNext } from "@/components/site/page-next";
import { getCopy } from "@/lib/i18n/server";
import { getProjects } from "@/lib/data/public";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return {
    title: copy.projects.title,
    description: copy.projects.lead,
    alternates: { canonical: "/projects" },
  };
}

export default async function ProjectsPage() {
  const copy = await getCopy();
  const projects = await getProjects();
  return (
    <>
      <PageHeader eyebrow={copy.projects.eyebrow} title={copy.projects.title} lead={copy.projects.lead} />
      <section className="mx-auto w-[min(1200px,calc(100%-2rem))]">
        <ProjectBrowser projects={projects} />
      </section>
      <PageNext current="/projects" />
    </>
  );
}
