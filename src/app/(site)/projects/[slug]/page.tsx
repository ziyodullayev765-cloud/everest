import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Code2 } from "lucide-react";
import { ProjectThumb } from "@/components/site/project-card";
import { ImageGallery } from "@/components/site/image-gallery";
import { CaseStudy } from "@/components/site/case-study";
import { Reveal } from "@/components/ui/reveal";
import { RichText } from "@/components/ui/rich-text";
import { getCopy } from "@/lib/i18n/server";
import { getProjectBySlug, getProjects } from "@/lib/data/public";
import { dateRange } from "@/lib/i18n/dictionaries";
import { unique } from "@/lib/utils";

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
      images: p.thumbnail_url ? [{ url: p.thumbnail_url, alt: p.thumbnail_alt || p.title }] : ["/og"],
    },
    twitter: { card: p.thumbnail_url ? "summary_large_image" : "summary", title, description },
  };
}

export default async function ProjectPage({ params }: Params) {
  const copy = await getCopy();
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const timeline = dateRange(project.started_on, project.completed_on, false, copy);
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

  const all = await getProjects();
  const at = all.findIndex((p) => p.id === project.id);
  const next = all.length > 1 && at >= 0 ? all[(at + 1) % all.length] : null;
  const hasBody = !!project.description.trim();
  const metrics = (project.metrics ?? [])
    .map((m) => {
      const [value, ...rest] = m.split("|");
      return { value: value!.trim(), label: rest.join("|").trim() };
    })
    .filter((m) => m.value);
  const caseSteps = (
    [
      ["problem", copy.caseStudy.problem, project.problem],
      ["solution", copy.caseStudy.solution, project.solution],
      ["architecture", copy.caseStudy.architecture, project.architecture],
      ["results", copy.caseStudy.results, project.results],
    ] as const
  )
    .filter(([, , text]) => !!text?.trim())
    .map(([key, label, text]) => ({ key, label, content: <RichText text={text} /> }));
  const details = (
    <>
      {meta.length > 0 && (
        <dl className={hasBody ? "grid gap-5" : "grid gap-6 sm:grid-cols-3"}>
          {meta.map((m) => (
            <div key={m.label}>
              <dt className="text-subtle text-[0.7rem] tracking-[0.18em] uppercase">{m.label}</dt>
              <dd className="text-fg mt-1.5">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {(project.technologies.length > 0 || project.tags.length > 0) && (
        <div className={meta.length ? "border-line mt-6 border-t pt-6" : ""}>
          <p className="text-subtle text-[0.7rem] tracking-[0.18em] uppercase">{copy.projects.technologies}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {unique([...project.technologies, ...project.tags]).map((t) => (
              <li key={t} className="border-line rounded-full border px-3 py-1 text-xs text-[var(--fg-secondary)]">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="mx-auto w-[min(1200px,calc(100%-2rem))] pt-28 sm:pt-40">
        <nav aria-label="Breadcrumb" className="page-crumbs">
          <Link href="/">{copy.nav["/"]}</Link>
          <span aria-hidden>/</span>
          <Link href="/projects">{copy.projects.title}</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{project.title}</span>
        </nav>
        {project.category && <p className="ed-eyebrow mt-8">{project.category}</p>}
        <h1 className="page-title">{project.title}</h1>
        {project.summary && <p className="ed-intro page-lead">{project.summary}</p>}
        {(project.live_url || project.source_url) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {project.live_url && (
              <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="ed-button ed-button--accent">
                {copy.projects.live}
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            )}
            {project.source_url && (
              <a href={project.source_url} target="_blank" rel="noopener noreferrer" className="ed-button">
                <Code2 className="size-4" aria-hidden />
                {copy.projects.source}
              </a>
            )}
          </div>
        )}
      </header>

      {project.thumbnail_url && (
        <Reveal className="protected-media mx-auto mt-12 w-[min(1200px,calc(100%-2rem))] sm:mt-16">
          <ProjectThumb project={project} priority className="border-line aspect-[16/9] rounded-[2rem] border" />
        </Reveal>
      )}

      {hasBody ? (
        <div className="mx-auto mt-14 grid w-[min(1200px,calc(100%-2rem))] gap-12 lg:grid-cols-[1fr_320px]">
          <Reveal>
            <RichText text={project.description} />
          </Reveal>
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="glass rounded-3xl p-6">{details}</div>
          </aside>
        </div>
      ) : (
        (meta.length > 0 || project.technologies.length > 0 || project.tags.length > 0) && (
          <div className="mx-auto mt-12 w-[min(1200px,calc(100%-2rem))]">
            <div className="glass rounded-3xl p-6 sm:p-8">{details}</div>
          </div>
        )
      )}

      {(caseSteps.length > 0 || metrics.length > 0) && (
        <section className="mx-auto mt-20 w-[min(1200px,calc(100%-2rem))]" aria-labelledby="case-study">
          <h2 id="case-study" className="ed-eyebrow">
            {copy.caseStudy.title}
          </h2>
          {metrics.length > 0 && (
            <div
              className="border-line mt-8 grid gap-px overflow-hidden rounded-3xl border bg-[var(--border)]"
              style={{ gridTemplateColumns: `repeat(${metrics.length === 1 ? 1 : 2}, minmax(0, 1fr))` }}
              data-metrics={metrics.length}
            >
              {metrics.map((m, i) => (
                <Reveal key={i} delay={i * 0.06} className="bg-[var(--bg)] p-6 sm:p-8">
                  <p className="cs-metric-value">{m.value}</p>
                  {m.label && <p className="text-muted mt-3 text-sm">{m.label}</p>}
                </Reveal>
              ))}
            </div>
          )}
          {caseSteps.length > 0 && (
            <div className="mt-10">
              <CaseStudy steps={caseSteps} prevLabel={copy.caseStudy.prev} nextLabel={copy.caseStudy.next} />
            </div>
          )}
        </section>
      )}

      {project.gallery.length > 0 && (
        <section className="mx-auto mt-20 w-[min(1200px,calc(100%-2rem))]" aria-labelledby="project-gallery">
          <h2 id="project-gallery" className="ed-eyebrow">
            {copy.projects.gallery}
          </h2>
          <div className="mt-8">
            <ImageGallery images={project.gallery.map((g) => ({ src: g.url, alt: g.alt || project.title }))} />
          </div>
        </section>
      )}

      {next && (
        <div className="mx-auto mt-24 w-[min(1200px,calc(100%-2rem))] sm:mt-32">
          <Link href={`/projects/${next.slug}`} className="page-next group">
            <span className="ed-eyebrow">{copy.projects.nextProject}</span>
            <span className="page-next-title">
              {next.title}
              <ArrowRight className="page-next-arrow" aria-hidden />
            </span>
          </Link>
        </div>
      )}
    </article>
  );
}
