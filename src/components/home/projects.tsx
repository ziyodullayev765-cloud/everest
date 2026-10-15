"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { copy } from "@/lib/copy";
import type { Project } from "@/lib/types";
import { unique } from "@/lib/utils";
import { HomeHeading } from "./section-heading";

function badgeFor(p: Project) {
  const role = p.role.toLowerCase();
  if (/\bsolo\b/.test(role)) return "Solo";
  if (/\bteam\b/.test(role)) return "Team";
  return p.category;
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const year = (project.completed_on ?? project.started_on)?.slice(0, 4);
  const badge = badgeFor(project);
  const tags = unique([...project.technologies, ...project.tags]).slice(0, 4);
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group bronze-border border-line bg-surface hover:border-line-strong flex w-[82vw] max-w-[420px] shrink-0 snap-center flex-col overflow-hidden rounded-3xl border shadow-[var(--shadow)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-hover)] sm:w-[380px] lg:w-[420px]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {project.thumbnail_url ? (
          <SmartImage
            src={project.thumbnail_url}
            alt={project.thumbnail_alt || project.title}
            fill
            sizes="420px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 grid place-items-center transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            style={{
              background:
                "radial-gradient(120% 90% at 20% 10%, color-mix(in oklab, var(--gold) 28%, transparent), transparent 55%), radial-gradient(90% 80% at 90% 100%, color-mix(in oklab, var(--copper) 35%, transparent), transparent 60%), var(--surface-strong)",
            }}
          >
            <span className="font-display text-[4.5rem] font-semibold text-[var(--fg)] opacity-20">
              {project.title.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="ed-glass rounded-full px-2.5 py-1 font-mono text-[0.7rem] font-semibold">
            {String(index + 1).padStart(2, "0")}
          </span>
          {badge && (
            <span className="ed-glass text-gold rounded-full px-2.5 py-1 text-[0.66rem] font-semibold tracking-[0.12em] uppercase">
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="group-hover:text-gold flex items-start justify-between gap-3 text-[1.45rem] transition-colors">
          {project.title}
          <ArrowUpRight
            className="mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </h3>
        {project.summary && (
          <p className="mt-3 line-clamp-3 text-[0.95rem] leading-relaxed text-[var(--fg-secondary)]">{project.summary}</p>
        )}
        <div className="border-line mt-auto flex items-center justify-between gap-3 border-t pt-4">
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((t) => (
              <span key={t} className="border-line rounded-full border px-2.5 py-0.5 text-[0.7rem] text-[var(--fg-secondary)]">
                {t}
              </span>
            ))}
          </div>
          {year && <span className="text-muted shrink-0 font-mono text-xs">{year}</span>}
        </div>
      </div>
    </Link>
  );
}

/**
 * Featured projects. On wide screens the section pins while vertical scrolling
 * slides the row of cards sideways (sticky + transform, no scroll hijacking);
 * on small screens and under reduced motion it is a native swipeable row.
 */
export function Projects({ projects }: { projects: Project[] }) {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = outer.current;
    const row = track.current;
    if (!el || !row) return;
    const wide = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    let distance = 0;
    let raf = 0;

    const measure = () => {
      if (!wide.matches) {
        el.style.height = "";
        row.style.transform = "";
        distance = 0;
        return;
      }
      distance = Math.max(0, row.scrollWidth - window.innerWidth + 96);
      el.style.height = `${window.innerHeight + distance}px`;
      update();
    };
    const update = () => {
      raf = 0;
      if (!distance) return;
      const top = el.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, -top / distance));
      row.style.transform = `translate3d(${-progress * distance}px, 0, 0)`;
    };
    const onScroll = () => {
      if (!raf && distance) raf = requestAnimationFrame(update);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    wide.addEventListener("change", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      wide.removeEventListener("change", measure);
    };
  }, [projects.length]);

  return (
    <section id="projects" aria-labelledby="projects-title" className="scroll-mt-24">
      <div ref={outer} className="relative">
        <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-center lg:overflow-hidden">
          <div className="mx-auto w-[min(1200px,calc(100%-2rem))] pt-24 lg:pt-20">
            <HomeHeading
              id="projects-title"
              eyebrow="Selected work"
              title={copy.sections.featuredProjects}
              lead={projects.length ? "Scroll to move through the work — click a card for the full story." : copy.projects.empty}
            >
              <Link href="/projects" className="ed-button">
                {copy.sections.allProjects}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </HomeHeading>
          </div>
          {projects.length > 0 && (
            <div className="mt-10 [scrollbar-width:none] overflow-x-auto lg:overflow-visible">
              <div
                ref={track}
                className="flex w-max snap-x snap-mandatory gap-6 px-4 pb-8 will-change-transform sm:px-[max(1rem,calc((100vw-1200px)/2))]"
              >
                {projects.map((p, i) => (
                  <ProjectCard key={p.id} project={p} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
