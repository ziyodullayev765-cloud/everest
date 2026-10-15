"use client";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

/** Fades/slides content in once when it scrolls into view. Static under reduced motion. */
export function Reveal({
  delay = 0,
  y = 24,
  className,
  children,
  ...rest
}: { delay?: number; y?: number } & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className as string}>{children as React.ReactNode}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
