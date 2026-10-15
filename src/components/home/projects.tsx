"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { useCopy } from "@/components/i18n/provider";
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
      data-card
      draggable={false}
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
 * Featured projects as a row you move yourself: drag it with the mouse,
 * swipe on touch screens, use the arrow buttons or the keyboard. Cards snap
 * into place; nothing moves on its own.
 */
export function Projects({ projects, labels }: { projects: Project[]; labels: { prev: string; next: string; hint: string } }) {
  const copy = useCopy();
  const row = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = () => {
    const el = row.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    updateEdges();
    // Mouse drag-to-scroll (touch already swipes natively).
    let down = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        el.dataset.dragging = "true";
      }
      if (moved) el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      if (moved) {
        delete el.dataset.dragging;
        // Settle on the nearest card.
        const card = el.querySelector<HTMLElement>("[data-card]");
        const step = card ? card.offsetWidth + 24 : el.clientWidth;
        el.scrollTo({ left: Math.round(el.scrollLeft / step) * step, behavior: "smooth" });
      }
    };
    // A drag should not also count as a click on the card underneath.
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [projects.length]);

  const go = (dir: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    el.scrollBy({ left: dir * (card ? card.offsetWidth + 24 : el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section id="projects" aria-labelledby="projects-title" className="scroll-mt-24 py-14 sm:py-20">
      <div className="mx-auto w-[min(1200px,calc(100%-2rem))]">
        <HomeHeading
          id="projects-title"
          eyebrow={copy.homePage.selectedWork}
          title={copy.sections.featuredProjects}
          lead={projects.length ? labels.hint : copy.projects.empty}
        >
          <div className="flex items-center gap-2">
            {projects.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  disabled={edges.start}
                  aria-label={labels.prev}
                  className="ed-icon-btn disabled:opacity-35"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  disabled={edges.end}
                  aria-label={labels.next}
                  className="ed-icon-btn disabled:opacity-35"
                >
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </>
            )}
            <Link href="/projects" className="ed-button ml-2">
              {copy.sections.allProjects}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
        </HomeHeading>
      </div>
      {projects.length > 0 && (
        <div
          ref={row}
          role="region"
          aria-label={copy.sections.featuredProjects}
          tabIndex={0}
          className="mt-10 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-6 overflow-x-auto px-4 pb-6 data-[dragging=true]:cursor-grabbing data-[dragging=true]:snap-none data-[dragging=true]:select-none sm:scroll-px-[max(1rem,calc((100vw-1200px)/2))] sm:px-[max(1rem,calc((100vw-1200px)/2))] lg:cursor-grab [&::-webkit-scrollbar]:hidden"
        >
          {projects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
