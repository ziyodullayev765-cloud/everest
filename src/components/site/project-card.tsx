import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProjectThumb({ project, className, priority }: { project: Project; className?: string; priority?: boolean }) {
  return (
    <div className={cn("bg-bg-elevated relative overflow-hidden", className)}>
      {project.thumbnail_url ? (
        <SmartImage
          src={project.thumbnail_url}
          alt={project.thumbnail_alt || project.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="ease-out-expo object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid-backdrop absolute inset-0 opacity-60" />
          <span className="relative text-5xl font-semibold tracking-tighter text-white/10">
            {project.title.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
    </div>
  );
}

export function ProjectCard({
  project,
  priority,
  featuredLabel,
}: {
  project: Project;
  priority?: boolean;
  featuredLabel?: string;
}) {
  return (
    <article className="group border-line ease-out-expo hover:border-line-strong relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-white/[0.02] transition-all duration-500 hover:-translate-y-1 hover:bg-white/[0.035] hover:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
      <ProjectThumb project={project} priority={priority} className="aspect-[16/10]" />
      <div className="flex flex-1 flex-col p-6">
        <div className="text-subtle mb-3 flex flex-wrap items-center gap-2 text-xs">
          {project.category && <span className="font-mono tracking-[0.16em] uppercase">{project.category}</span>}
          {project.featured && featuredLabel && (
            <span className="bg-accent/15 text-accent rounded-full px-2 py-0.5 text-[0.7rem] font-medium">{featuredLabel}</span>
          )}
        </div>
        <h3 className="text-xl font-semibold tracking-tight">
          <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {project.title}
          </Link>
        </h3>
        {project.summary && <p className="text-muted mt-2 line-clamp-3 text-[0.95rem] leading-relaxed">{project.summary}</p>}
        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <ul className="flex flex-wrap gap-1.5" aria-label="Texnologiyalar">
            {project.technologies.slice(0, 4).map((t) => (
              <li key={t} className="border-line text-muted rounded-full border px-2.5 py-1 text-xs">
                {t}
              </li>
            ))}
          </ul>
          <span className="border-line text-muted group-hover:border-accent group-hover:bg-accent grid size-10 shrink-0 place-items-center rounded-full border transition-all duration-500 group-hover:text-black">
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </article>
  );
}
