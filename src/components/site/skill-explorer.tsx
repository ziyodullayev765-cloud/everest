"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { projectUsesSkill } from "@/lib/skill-match";
import { cn } from "@/lib/utils";

interface P {
  slug: string;
  title: string;
  summary: string;
  tech: string[];
}

/** Pick a skill → the projects built with it slide in. Skills with no project are left out. */
export function SkillExplorer({
  skills,
  projects,
  labels,
}: {
  skills: string[];
  projects: P[];
  labels: { title: string; lead: string; count: string };
}) {
  const reduce = useReducedMotion();
  const usable = useMemo(
    () =>
      skills
        .map((name) => ({ name, matches: projects.filter((p) => projectUsesSkill(name, p.tech)) }))
        .filter((s) => s.matches.length > 0),
    [skills, projects],
  );
  const [active, setActive] = useState<string | null>(usable[0]?.name ?? null);
  if (!usable.length) return null;
  const current = usable.find((s) => s.name === active) ?? usable[0]!;

  return (
    <section className="mt-20" aria-labelledby="skill-explorer">
      <h2 id="skill-explorer" className="ed-eyebrow">
        {labels.title}
      </h2>
      <p className="text-muted mt-3 max-w-xl">{labels.lead}</p>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={labels.title}>
        {usable.map((s) => (
          <button
            key={s.name}
            type="button"
            aria-pressed={s.name === current.name}
            onClick={() => setActive(s.name)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition",
              s.name === current.name
                ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                : "border-line text-[var(--fg-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]",
            )}
          >
            {s.name} <span className="opacity-60">· {s.matches.length}</span>
          </button>
        ))}
      </div>
      <p className="text-subtle mt-6 text-xs tracking-[0.18em] uppercase" aria-live="polite">
        {labels.count.replace("{n}", String(current.matches.length))}
      </p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {current.matches.map((p, i) => (
            <motion.li
              key={`${current.name}-${p.slug}`}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { delay: reduce ? 0 : i * 0.05, duration: 0.35 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <Link
                href={`/projects/${p.slug}`}
                className="group border-line bg-surface flex h-full items-start justify-between gap-4 rounded-2xl border p-5 transition hover:border-[var(--border-strong)]"
              >
                <span className="min-w-0">
                  <span className="font-display block text-xl">{p.title}</span>
                  {p.summary && <span className="text-muted mt-1 line-clamp-2 block text-sm">{p.summary}</span>}
                </span>
                <ArrowUpRight
                  className="text-subtle size-5 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
