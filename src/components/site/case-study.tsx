"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export interface CaseStep {
  key: string;
  label: string;
  content: ReactNode;
}

/**
 * Problem → Solution → Architecture → Results as tabbed "slides".
 * Arrow keys move between steps; each panel slides in from the direction you went.
 */
export function CaseStudy({ steps, prevLabel, nextLabel }: { steps: CaseStep[]; prevLabel: string; nextLabel: string }) {
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState(1);
  const reduce = useReducedMotion();
  const id = useId();
  const go = (i: number) => {
    const n = (i + steps.length) % steps.length;
    setDir(n > at ? 1 : -1);
    setAt(n);
  };
  const step = steps[at]!;

  return (
    <div>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="cs-tabs"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const n = at + (e.key === "ArrowRight" ? 1 : -1);
            go(n);
            const target = (n + steps.length) % steps.length;
            document.getElementById(`${id}-tab-${target}`)?.focus();
          }
        }}
      >
        {steps.map((s, i) => (
          <button
            key={s.key}
            id={`${id}-tab-${i}`}
            type="button"
            role="tab"
            aria-selected={i === at}
            aria-controls={`${id}-panel`}
            tabIndex={i === at ? 0 : -1}
            className="cs-tab"
            onClick={() => go(i)}
          >
            <span className="cs-tab-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="font-medium">{s.label}</span>
            {i === at && (
              <motion.span
                layoutId={`${id}-bar`}
                className="cs-tab-bar"
                transition={{ type: "spring", stiffness: 400, damping: 36 }}
              />
            )}
          </button>
        ))}
      </div>

      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${at}`}
        className="relative mt-8 min-h-[5rem] overflow-hidden"
      >
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step.key}
            custom={dir}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {step.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {steps.length > 1 && (
        <div className="mt-8 flex items-center justify-between gap-4">
          <span className="text-subtle text-xs tracking-[0.18em] tabular-nums">
            {String(at + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </span>
          <div className="flex gap-2">
            <button type="button" className="ed-button" onClick={() => go(at - 1)} aria-label={prevLabel}>
              <ArrowLeft className="size-4" aria-hidden />
            </button>
            <button type="button" className="ed-button" onClick={() => go(at + 1)} aria-label={nextLabel}>
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
