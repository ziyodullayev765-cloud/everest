"use client";
import { useEffect, useRef } from "react";

const COLORS = ["#1ea55a", "#1a96e0", "#ffc22e", "#e5484d", "#8a56e2", "#ff8a3d"];

/** Lightweight canvas confetti burst. Respects reduced-motion. */
export function Confetti({ pieces = 120, duration = 2200 }: { pieces?: number; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
    };
    resize();
    const parts = Array.from({ length: pieces }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.3,
      y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 6,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      w: 6 + Math.random() * 6,
      h: 10 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    const start = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      const k = (t - start) / duration;
      g.clearRect(0, 0, c.width, c.height);
      for (const p of parts) {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        g.save();
        g.globalAlpha = Math.max(0, 1 - k);
        g.translate(p.x * dpr, p.y * dpr);
        g.rotate(p.r);
        g.fillStyle = p.color;
        g.fillRect((-p.w / 2) * dpr, (-p.h / 2) * dpr, p.w * dpr, p.h * dpr);
        g.restore();
      }
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    };
  }, [pieces, duration]);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[95] h-full w-full" aria-hidden />;
}
