import type { Metadata } from "next";
import { PageHeader } from "@/components/site/section-heading";
import { ProjectBrowser } from "@/components/site/project-browser";
import { copy } from "@/lib/copy";
import { getProjects } from "@/lib/data/public";

export const metadata: Metadata = {
  title: copy.projects.title,
  description: copy.projects.lead,
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
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
