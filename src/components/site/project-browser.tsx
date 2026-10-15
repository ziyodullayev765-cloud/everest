"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, LayoutGrid, List, Search } from "lucide-react";
import { ProjectCard, ProjectThumb } from "./project-card";
import { copy } from "@/lib/copy";
import type { Project } from "@/lib/types";
import { cn, formatMonthYear, unique } from "@/lib/utils";

export function ProjectBrowser({ projects }: { projects: Project[] }) {
  const [view, setView] = useState<"grid" | "list">("grid");
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
      active ? "bg-fg text-black" : "border border-line text-muted hover:border-line-strong hover:text-fg",
    );

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
          <div className="border-line flex rounded-full border p-1" role="group" aria-label="Ko‘rinish">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              aria-label={copy.projects.grid}
              className={cn(
                "grid size-9 place-items-center rounded-full transition",
                view === "grid" ? "text-fg bg-white/10" : "text-subtle hover:text-fg",
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
                view === "list" ? "text-fg bg-white/10" : "text-subtle hover:text-fg",
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
                tag === t ? "bg-accent text-black" : "text-subtle hover:text-fg bg-white/[0.04]",
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
        <ul className="divide-line border-line mt-10 divide-y border-y">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.slug}`}
                className="group grid grid-cols-[88px_1fr_auto] items-center gap-4 py-5 sm:grid-cols-[140px_1fr_auto] sm:gap-6"
              >
                <ProjectThumb project={p} className="aspect-[4/3] rounded-xl" />
                <div className="min-w-0">
                  <p className="text-subtle font-mono text-[0.7rem] tracking-[0.16em] uppercase">
                    {[p.category, formatMonthYear(p.completed_on ?? p.started_on)].filter(Boolean).join(" · ")}
                  </p>
                  <h3 className="group-hover:text-accent mt-1 truncate text-lg font-semibold tracking-tight transition sm:text-xl">
                    {p.title}
                  </h3>
                  {p.summary && <p className="text-muted mt-1 line-clamp-1 text-sm">{p.summary}</p>}
                </div>
                <ArrowUpRight
                  className="text-subtle group-hover:text-accent size-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
