"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&";
const DURATION = 1200; // ms, independent of frame rate

/**
 * Text that resolves from random glyphs, left to right, when it first comes
 * into view. Every letter keeps its own fixed slot (the real letter stays in
 * the layout, invisible, while a glyph is drawn on top), so nothing jumps or
 * re-wraps while it plays. The final text is server-rendered (no empty flash,
 * good for SEO) and screen readers always get the real text.
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
  const chars = [...text];
  // null = letter revealed; a string = glyph currently covering it. The first
  // frame is rendered on the server too (deterministic glyphs), so the real
  // name never flashes before the effect starts; <noscript> reveals it.
  const [cover, setCover] = useState<(string | null)[] | null>(() =>
    chars.map((ch, i) => (ch === " " ? null : GLYPHS[(i * 7 + 3) % GLYPHS.length]!)),
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCover(null);
      return;
    }
    const letters = [...text];
    let raf = 0;
    let lastSwap = 0;
    const run = () => {
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / DURATION);
        const revealed = Math.floor(k * letters.length);
        // Swap glyphs ~25 times a second rather than every frame: calmer, cheaper.
        if (t - lastSwap > 40 || k === 1) {
          lastSwap = t;
          setCover(
            k === 1
              ? null
              : letters.map((ch, i) => (ch === " " || i < revealed ? null : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!)),
          );
        }
        if (k < 1) raf = requestAnimationFrame(tick);
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
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text]);

  return (
    <Tag ref={ref as never} className={className} aria-label={text}>
      <noscript>
        <style>{`.scramble-cover{display:none}.scramble-real{visibility:visible!important}`}</style>
      </noscript>
      <span aria-hidden>
        {chars.map((ch, i) => {
          const glyph = cover?.[i];
          if (!glyph) return <span key={i}>{ch}</span>;
          return (
            <span key={i} className="relative inline-block">
              <span className="scramble-real invisible">{ch}</span>
              <span className="scramble-cover absolute inset-0 text-center">{glyph}</span>
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
