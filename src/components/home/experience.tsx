"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { ArrowUpRight, Download } from "lucide-react";
import { EdSection } from "@/components/site/ed-section";
import { useCopy } from "@/components/i18n/provider";
import type { Experience as ExperienceRow } from "@/lib/types";
import { dateRange } from "@/lib/i18n/dictionaries";
import { HomeHeading } from "./section-heading";

/** Vertical timeline whose bronze line fills in as you scroll through it. */
export function Experience({ items, resumeUrl }: { items: ExperienceRow[]; resumeUrl: string | null }) {
  const copy = useCopy();
  const list = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: list, offset: ["start 75%", "end 55%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  if (!items.length) return null;
  return (
    <EdSection id="experience" className="mx-auto w-[min(1200px,calc(100%-2rem))] py-14 sm:py-24">
      <HomeHeading eyebrow={copy.homePage.journeySoFar} title={copy.homePage.experience}>
        <div className="flex flex-wrap gap-3">
          <Link href="/experience" className="ed-button">
            {copy.homePage.fullTimeline}
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
          {resumeUrl && (
            <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="ed-button ed-button--accent" download>
              <Download className="size-4" aria-hidden />
              {copy.downloadCv}
            </a>
          )}
        </div>
      </HomeHeading>

      <ol ref={list} className="relative mt-14 ml-3 sm:ml-4">
        <span aria-hidden className="absolute top-2 bottom-2 left-0 w-px bg-[var(--border)]" />
        <motion.span
          aria-hidden
          className="absolute top-2 bottom-2 left-0 w-px origin-top"
          style={{
            scaleY: reduce ? 1 : fill,
            background: "linear-gradient(var(--gold), var(--accent), var(--copper))",
          }}
        />
        {items.map((e) => {
          const period = e.period_label?.trim() || dateRange(e.start_date, e.end_date, e.is_current, copy);
          return (
            <li key={e.id} className="relative pb-12 pl-8 last:pb-0 sm:pl-12">
              <span
                aria-hidden
                className="border-accent bg-bg absolute top-2 left-0 size-3 -translate-x-1/2 rounded-full border-2"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <h3 className="text-[clamp(1.4rem,3vw,1.9rem)]">
                  {e.organization}
                  {e.role && <span className="text-gold"> — {e.role}</span>}
                </h3>
                {period && <span className="text-muted shrink-0 font-mono text-xs tracking-[0.08em] uppercase">{period}</span>}
              </div>
              {e.description && (
                <p className="mt-3 max-w-3xl leading-relaxed text-[var(--fg-secondary)]">
                  {e.description.replace(/[#*_`>]/g, "").split("\n")[0]}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </EdSection>
  );
}
