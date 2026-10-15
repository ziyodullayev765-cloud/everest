"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Giant text whose letters rise in on load and bounce + light up in rainbow
 * colours when the pointer touches them.
 */
export function PlayfulText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);
  let index = 0;
  return (
    <span className={cn("inline-block", className)} aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap" aria-hidden>
          {word.split("").map((ch) => {
            const i = index++;
            return (
              <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                <motion.span
                  className="hover:text-rainbow inline-block cursor-default transition-colors duration-300"
                  initial={reduce ? false : { y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ delay: delay + i * 0.045, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={reduce ? undefined : { y: "-12%", rotate: i % 2 ? 6 : -6, scale: 1.08 }}
                >
                  {ch}
                </motion.span>
              </span>
            );
          })}
          {wi < words.length - 1 && <span className="inline-block w-[0.28em]" />}
        </span>
      ))}
    </span>
  );
}
