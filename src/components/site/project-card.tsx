import Link from "next/link";
import { SmartImage } from "@/components/ui/smart-image";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

const PALETTE = ["var(--accent)", "var(--c-pink)", "var(--c-cyan)", "var(--c-amber)", "var(--c-lime)"];

/** Stable, colourful cover for projects without a thumbnail (picked from the title). */
function placeholderGradient(title: string) {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = PALETTE[h % PALETTE.length];
  const b = PALETTE[(h >> 3) % PALETTE.length] === a ? PALETTE[(h + 1) % PALETTE.length] : PALETTE[(h >> 3) % PALETTE.length];
  return `radial-gradient(circle at 25% 20%, ${a}, transparent 55%), radial-gradient(circle at 80% 85%, ${b}, transparent 55%), #0d0b14`;
}

export function ProjectThumb({
  project,
  className,
  priority,
  hero,
}: {
  project: Project;
  className?: string;
  priority?: boolean;
  /** The page's main image: target of the page-transition morph. */
  hero?: boolean;
}) {
  return (
    <div
      className={cn("bg-bg-elevated relative overflow-hidden", className)}
      {...(hero ? { "data-vt-hero": "" } : { "data-vt-thumb": "" })}
    >
      {project.thumbnail_url ? (
        <SmartImage
          src={project.thumbnail_url}
          alt={project.thumbnail_alt || project.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="ease-out-expo object-cover transition-[transform,filter] duration-[1.2s] group-hover:scale-[1.04] group-hover:brightness-110 group-hover:saturate-[1.08]"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="ease-out-expo absolute inset-0 opacity-70 transition-transform duration-[1.2s] group-hover:scale-110 group-hover:rotate-3"
            style={{ background: placeholderGradient(project.title) }}
          />
          <div className="grid-backdrop absolute inset-0 opacity-40" />
          <span className="font-display relative text-6xl tracking-tighter text-white/80 mix-blend-overlay">
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
    <article className="border-rainbow group border-line ease-out-expo hover:border-line-strong relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-white/[0.02] transition-all duration-500 hover:-translate-y-1 hover:bg-white/[0.035] hover:shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
      <ProjectThumb project={project} priority={priority} className="aspect-[16/10]" />
      <div className="flex flex-1 flex-col p-6">
        <div className="text-subtle mb-3 flex flex-wrap items-center gap-2 text-xs">
          {project.category && <span className="font-mono tracking-[0.16em] uppercase">{project.category}</span>}
          {project.featured && featuredLabel && (
            <span className="border-line rounded-full border px-2 py-0.5 text-[0.7rem] font-medium text-[var(--fg-secondary)]">
              {featuredLabel}
            </span>
          )}
        </div>
        <h3 className="text-xl font-semibold tracking-tight">
          <Link
            href={`/projects/${project.slug}`}

            className="after:absolute after:inset-0 after:content-['']"
          >
            {project.title}
          </Link>
        </h3>
        {project.summary && <p className="text-muted mt-2 line-clamp-3 text-[0.95rem] leading-relaxed">{project.summary}</p>}
        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <ul className="flex flex-wrap gap-1.5" aria-label="Technologies">
            {project.technologies.slice(0, 4).map((t) => (
              <li key={t} className="border-line text-muted rounded-full border px-2.5 py-1 text-xs">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
