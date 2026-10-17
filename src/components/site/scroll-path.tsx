"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

/** Draws a line down the timeline's left edge as the visitor scrolls through it. */
export function ScrollPath({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <div ref={ref} className="relative">
      {children}
      {!reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute top-0 bottom-0 left-[-0.5px] w-[2px] origin-top rounded-full bg-[var(--name-tint)]"
          style={{ scaleY }}
        />
      )}
    </div>
  );
}
