"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

/**
 * Text that resolves from random glyphs, left to right, the first time it
 * comes into view. Server-renders the final text (no empty flash, good for
 * SEO) and exposes it to screen readers unchanged.
 */
export function ScrambleText({
  text,
  as: Tag = "span",
  className,
}: {
  text: string;
  as?: "h1" | "h2" | "span" | "p";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(text);

  useEffect(() => {
    setShown(text);
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const DURATION = 1100; // ms, independent of frame rate
    const run = () => {
      const chars = [...text];
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / DURATION);
        const revealed = Math.floor(k * chars.length);
        setShown(
          chars.map((ch, i) => (ch === " " || i < revealed ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(""),
        );
        if (k < 1) raf = requestAnimationFrame(tick);
        else setShown(text);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text]);

  return (
    <Tag ref={ref as never} className={className} aria-label={text}>
      <span aria-hidden>{shown}</span>
    </Tag>
  );
}
