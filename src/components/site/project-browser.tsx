"use client";

import Link from "next/link";
import { StageBadge } from "./stage-badge";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, LayoutGrid, List, Search } from "lucide-react";
import { ProjectCard, ProjectThumb } from "./project-card";
import { useCopy } from "@/components/i18n/provider";
import type { Project } from "@/lib/types";
import { cn, unique } from "@/lib/utils";
import { monthYear } from "@/lib/i18n/dictionaries";

export function ProjectBrowser({ projects }: { projects: Project[] }) {
  const copy = useCopy();
  const [view, setView] = useState<"grid" | "list">("list");
  const [active, setActive] = useState(0);
  const [category, setCategory] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [query, setQuery] = useState("");

  const categories = useMemo(() => unique(projects.map((p) => p.category).filter(Boolean)).sort(), [projects]);
  const tags = useMemo(() => unique(projects.flatMap((p) => [...p.tags, ...p.technologies])).sort(), [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (category && p.category !== category) return false;
      if (tag && !p.tags.includes(tag) && !p.technologies.includes(tag)) return false;
      if (!q) return true;
      return [p.title, p.summary, p.category, ...p.tags, ...p.technologies].join(" ").toLowerCase().includes(q);
    });
  }, [projects, category, tag, query]);

  const chip = (active: boolean) =>
    cn(
      "h-9 rounded-full px-4 text-sm transition-colors",
      active ? "bg-fg text-bg" : "border border-line text-muted hover:border-line-strong hover:text-fg",
    );

  const current = active < filtered.length ? active : 0;

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label={copy.projects.category}>
          <button type="button" className={chip(category === "")} aria-pressed={category === ""} onClick={() => setCategory("")}>
            {copy.projects.all}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={chip(category === c)}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative flex-1 lg:w-72 lg:flex-none">
            <span className="sr-only">{copy.projects.search}</span>
            <Search className="text-subtle pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.projects.search}
              className="border-line text-fg placeholder:text-subtle focus:border-accent/60 h-11 w-full rounded-full border bg-white/[0.03] pr-4 pl-10 text-sm focus:outline-none"
            />
          </label>
          <div className="border-line flex rounded-full border p-1" role="group" aria-label="View">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              aria-label={copy.projects.grid}
              className={cn(
                "grid size-9 place-items-center rounded-full transition",
                view === "grid" ? "text-fg bg-[color-mix(in_oklab,var(--fg)_10%,transparent)]" : "text-subtle hover:text-fg",
              )}
            >
              <LayoutGrid className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              aria-label={copy.projects.list}
              className={cn(
                "grid size-9 place-items-center rounded-full transition",
                view === "list" ? "text-fg bg-[color-mix(in_oklab,var(--fg)_10%,transparent)]" : "text-subtle hover:text-fg",
              )}
            >
              <List className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Teglar">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? "" : t)}
              aria-pressed={tag === t}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition",
                tag === t ? "bg-fg text-bg" : "text-subtle hover:text-fg bg-[color-mix(in_oklab,var(--fg)_5%,transparent)]",
              )}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {filtered.length} ta loyiha
      </p>

      {filtered.length === 0 ? (
        <div className="glass text-muted mt-10 rounded-3xl p-12 text-center">
          {projects.length === 0 ? copy.projects.empty : copy.projects.noMatch}
        </div>
      ) : view === "grid" ? (
        <motion.ul layout className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <ProjectCard project={p} priority={i < 2} featuredLabel={copy.projects.featured} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          <ul className="border-line border-t">
            {filtered.map((p, i) => (
              <li key={p.id} className="border-line border-b">
                <Link
                  href={`/projects/${p.slug}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  data-active={current === i || undefined}
                  className="project-row group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-6 sm:gap-8 sm:py-8"
                >
                  <span className="text-subtle w-8 font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="project-row-title font-display block truncate text-[clamp(1.7rem,4.5vw,3.4rem)] leading-[1.05] normal-case">
                      {p.title}
                    </span>
                    <span className="text-muted mt-2 flex min-w-0 items-center gap-3 text-sm">
                      <span className="truncate">
                        {[p.category, monthYear(p.completed_on ?? p.started_on, copy)].filter(Boolean).join(" · ")}
                      </span>
                      <StageBadge stage={p.stage} label={p.stage ? copy.stage[p.stage] : undefined} className="shrink-0" />
                    </span>
                  </span>
                  <span className="relative block w-20 shrink-0 overflow-hidden rounded-xl lg:hidden">
                    <ProjectThumb project={p} className="aspect-[4/3]" />
                  </span>
                  <ArrowUpRight className="project-row-arrow text-subtle hidden size-6 lg:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          {/* Desktop: the hovered project's cover, cross-fading in a sticky frame. */}
          <div className="hidden lg:block">
            <div className="border-line sticky top-28 aspect-[4/5] overflow-hidden rounded-[1.75rem] border">
              {filtered.map((p, i) => (
                <div key={p.id} className="project-preview" data-active={current === i || undefined} aria-hidden>
                  <ProjectThumb project={p} className="absolute inset-0" />
                  {p.summary && (
                    <p className="absolute inset-x-0 bottom-0 p-6 text-sm leading-relaxed text-white/90">{p.summary}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
