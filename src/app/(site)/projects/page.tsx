import type { Metadata } from "next";
import { PageHeader } from "@/components/site/section-heading";
import { ProjectBrowser } from "@/components/site/project-browser";
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
      <PageHeader eyebrow={`${projects.length}`} title={copy.projects.title} lead={copy.projects.lead} />
      <section className="container-x">
        <ProjectBrowser projects={projects} />
      </section>
    </>
  );
}
