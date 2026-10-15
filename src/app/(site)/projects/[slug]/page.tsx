import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Code2 } from "lucide-react";
import { ProjectThumb } from "@/components/site/project-card";
import { ImageGallery } from "@/components/site/image-gallery";
import { Reveal } from "@/components/ui/reveal";
import { RichText } from "@/components/ui/rich-text";
import { buttonClass } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { getProjectBySlug, getProjects } from "@/lib/data/public";
import { formatRange } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = true;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProjectBySlug(slug);
  if (!p) notFound();
  const title = p.seo_title || p.title;
  const description = p.seo_description || p.summary || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/projects/${p.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/projects/${p.slug}`,
      images: p.thumbnail_url ? [{ url: p.thumbnail_url, alt: p.thumbnail_alt || p.title }] : undefined,
    },
    twitter: { card: p.thumbnail_url ? "summary_large_image" : "summary", title, description },
  };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const timeline = formatRange(project.started_on, project.completed_on, false);
  const meta = [
    project.role && { label: copy.projects.role, value: project.role },
    project.category && { label: copy.projects.category, value: project.category },
    timeline && { label: copy.projects.timeline, value: timeline },
  ].filter(Boolean) as { label: string; value: string }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary || undefined,
    image: project.thumbnail_url || undefined,
    url: project.live_url || undefined,
    keywords: [...project.tags, ...project.technologies].join(", ") || undefined,
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="container-x pt-32 sm:pt-40">
        <Reveal>
          <Link href="/projects" className="text-muted hover:text-fg inline-flex items-center gap-2 text-sm transition">
            <ArrowLeft className="size-4" aria-hidden />
            {copy.projects.back}
          </Link>
          <h1 className="text-gradient mt-8 max-w-4xl text-4xl leading-[1.02] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            {project.title}
          </h1>
          {project.summary && <p className="text-muted mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl">{project.summary}</p>}
          {(project.live_url || project.source_url) && (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {project.live_url && (
                <a href={project.live_url} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg")}>
                  {copy.projects.live}
                  <ArrowUpRight className="size-4" aria-hidden />
                </a>
              )}
              {project.source_url && (
                <a href={project.source_url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "lg")}>
                  <Code2 className="size-4" aria-hidden />
                  {copy.projects.source}
                </a>
              )}
            </div>
          )}
        </Reveal>
      </header>

      {project.thumbnail_url && (
        <Reveal className="container-x mt-14">
          <ProjectThumb project={project} priority className="border-line aspect-[16/9] rounded-[2rem] border" />
        </Reveal>
      )}

      <div className="container-x mt-14 grid gap-12 lg:grid-cols-[1fr_320px]">
        <Reveal>
          <RichText text={project.description} />
        </Reveal>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="glass rounded-3xl p-6">
            {meta.length > 0 && (
              <dl className="grid gap-5">
                {meta.map((m) => (
                  <div key={m.label}>
                    <dt className="text-subtle font-mono text-[0.7rem] tracking-[0.18em] uppercase">{m.label}</dt>
                    <dd className="text-fg mt-1">{m.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {project.technologies.length > 0 && (
              <div className={meta.length ? "border-line mt-6 border-t pt-6" : ""}>
                <p className="text-subtle font-mono text-[0.7rem] tracking-[0.18em] uppercase">{copy.projects.technologies}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {project.technologies.map((t) => (
                    <li key={t} className="border-line text-muted rounded-full border px-2.5 py-1 text-xs">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {project.tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {project.tags.map((t) => (
                  <li key={t} className="text-subtle text-xs">
                    #{t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {project.gallery.length > 0 && (
        <section className="container-x mt-20" aria-labelledby="project-gallery">
          <h2 id="project-gallery" className="text-2xl font-semibold tracking-tight">
            {copy.projects.gallery}
          </h2>
          <div className="mt-8">
            <ImageGallery images={project.gallery.map((g) => ({ src: g.url, alt: g.alt || project.title }))} />
          </div>
        </section>
      )}
    </article>
  );
}
