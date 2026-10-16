"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Code2, X } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { useCopy } from "@/components/i18n/provider";
import type { Project } from "@/lib/types";
import { unique } from "@/lib/utils";

const QuickViewContext = createContext<((p: Project) => void) | null>(null);

/**
 * "Quick view" for projects: clicking a project card opens a floating panel
 * with the cover, summary, stack and links, without leaving the page. The
 * card stays a real link, so ⌘/Ctrl-click, middle-click and crawlers still
 * go straight to the project page.
 */
export function QuickViewProvider({ children }: { children: ReactNode }) {
  const copy = useCopy();
  const [project, setProject] = useState<Project | null>(null);
  const [mounted, setMounted] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);

  const open = useCallback((p: Project) => {
    opener.current = document.activeElement as HTMLElement | null;
    setProject(p);
  }, []);
  const close = useCallback(() => {
    setProject(null);
    requestAnimationFrame(() => opener.current?.focus());
  }, []);

  useEffect(() => {
    if (!project) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [project, close]);

  const cover = project && (project.thumbnail_url || project.gallery[0]?.url);
  const tags = project ? unique([...project.technologies, ...project.tags]) : [];

  return (
    <QuickViewContext.Provider value={open}>
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {project && (
              <motion.div
                key="quick-view"
                className="fixed inset-0 z-[95] grid place-items-center bg-[rgba(var(--bg-rgb),0.82)] p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={close}
                data-lenis-prevent
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="quick-view-title"
                  className="border-line bg-surface relative max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border shadow-[var(--shadow-hover)]"
                  initial={{ y: 28, scale: 0.97 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 16, scale: 0.98, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {cover && (
                    <div className="protected-media relative aspect-[16/9]">
                      <SmartImage
                        src={cover}
                        alt={project.thumbnail_alt || project.title}
                        fill
                        sizes="672px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <button
                    ref={closeBtn}
                    type="button"
                    onClick={close}
                    aria-label={copy.homePage.close}
                    className="ed-icon-btn bg-surface absolute top-3 right-3"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                  <div className="p-6 sm:p-8">
                    {project.category && <p className="ed-eyebrow">{project.category}</p>}
                    <h2
                      id="quick-view-title"
                      className="font-display mt-3 text-[clamp(1.8rem,4vw,2.6rem)] leading-tight normal-case"
                    >
                      {project.title}
                    </h2>
                    {project.summary && <p className="mt-3 leading-relaxed text-[var(--fg-secondary)]">{project.summary}</p>}
                    {project.role && (
                      <p className="text-muted mt-4 text-sm">
                        {copy.projects.role}: <span className="text-fg">{project.role}</span>
                      </p>
                    )}
                    {tags.length > 0 && (
                      <ul className="mt-5 flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                          <li key={t} className="border-line rounded-full border px-3 py-1 text-xs text-[var(--fg-secondary)]">
                            {t}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-7 flex flex-wrap gap-3">
                      <Link
                        href={`/projects/${project.slug}`}
                        className="ed-button ed-button--accent"
                        onClick={() => setProject(null)}
                      >
                        {copy.projects.details}
                        <ArrowUpRight className="size-4" aria-hidden />
                      </Link>
                      {project.live_url && (
                        <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="ed-button">
                          {copy.projects.live}
                        </a>
                      )}
                      {project.source_url && (
                        <a href={project.source_url} target="_blank" rel="noopener noreferrer" className="ed-button">
                          <Code2 className="size-4" aria-hidden />
                          {copy.projects.source}
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </QuickViewContext.Provider>
  );
}

/** A link to a project page that opens the quick view on a plain click. */
export function ProjectLink({ project, onClick, ...props }: { project: Project } & Omit<ComponentProps<typeof Link>, "href">) {
  const open = useContext(QuickViewContext);
  return (
    <Link
      {...props}
      href={`/projects/${project.slug}`}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !open || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        open(project);
      }}
    />
  );
}
