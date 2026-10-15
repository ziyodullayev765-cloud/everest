"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/** Counts the numeric part of a stat ("12+", "1400", "3.5") up from zero when it enters the viewport. */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const m = /^(\D*)(\d+(?:[.,]\d+)?)(.*)$/.exec(value);
  const [shown, setShown] = useState(m && !reduce ? `${m[1]}0${m[3]}` : value);

  useEffect(() => {
    if (!m || reduce || !inView) return;
    const target = Number(m[2]!.replace(",", "."));
    const decimals = (m[2]!.split(/[.,]/)[1] ?? "").length;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 1600);
      const eased = 1 - Math.pow(1 - k, 4);
      setShown(`${m[1]}${(target * eased).toFixed(decimals)}${m[3]}`);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className={className}>
      {shown}
    </span>
  );
}
