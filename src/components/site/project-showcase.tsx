"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { ProjectThumb } from "./project-card";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROW_COLORS = ["var(--accent)", "var(--c-pink)", "var(--c-cyan)", "var(--c-amber)", "var(--c-lime)"];

/**
 * Big-type project list. On desktop, hovering a row reveals a floating preview
 * image that follows the cursor; on touch devices it falls back to cards.
 */
export function ProjectShowcase({ projects }: { projects: Project[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 180, damping: 20 });
  const y = useSpring(useMotionValue(0), { stiffness: 180, damping: 20 });
  const current = hovered !== null ? projects[hovered] : null;

  return (
    <div
      className="relative"
      onPointerMove={(e) => {
        x.set(e.clientX);
        y.set(e.clientY);
      }}
    >
      <ul className="border-t border-white/10">
        {projects.map((p, i) => (
          <li key={p.id} className="border-b border-white/10">
            <Link
              href={`/projects/${p.slug}`}

              onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(i)}
              onPointerLeave={() => setHovered(null)}
              className="group relative flex items-center gap-4 py-7 sm:gap-8 sm:py-10"
            >
              <span
                className="absolute inset-0 origin-left scale-x-0 rounded-2xl opacity-15 transition-transform duration-700 ease-out group-hover:scale-x-100"
                style={{ background: `linear-gradient(90deg, ${ROW_COLORS[i % ROW_COLORS.length]}, transparent)` }}
                aria-hidden
              />
              <span className="relative font-mono text-xs text-white/40 tabular-nums sm:text-sm">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="font-display block truncate text-[clamp(1.6rem,5vw,4.5rem)] leading-[1.05] transition-transform duration-500 group-hover:translate-x-3">
                  <span className="group-hover:text-rainbow">{p.title}</span>
                </span>
                {(p.category || p.technologies.length > 0) && (
                  <span className="mt-2 block truncate text-sm text-white/50">
                    {[p.category, ...p.technologies.slice(0, 3)].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              <span
                className="relative grid size-12 shrink-0 place-items-center rounded-full ring-1 ring-white/20 transition-all duration-500 group-hover:rotate-45 group-hover:ring-0 sm:size-16"
                style={{ background: hovered === i ? ROW_COLORS[i % ROW_COLORS.length] : undefined }}
              >
                <ArrowUpRight
                  className={cn("size-5 transition-colors", hovered === i ? "text-black" : "text-white")}
                  aria-hidden
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {!reduce && (
        <motion.div className="pointer-events-none fixed top-0 left-0 z-40 hidden md:block" style={{ x, y }} aria-hidden>
          <AnimatePresence>
            {current && (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: -4 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 4 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="-translate-x-1/2 -translate-y-1/2"
              >
                <div className="w-[340px] overflow-hidden rounded-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/20">
                  <ProjectThumb project={current} className="aspect-[4/3]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
