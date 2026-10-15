"use client";

import { useEffect, useRef } from "react";

/**
 * Water-like pointer effect: faint rings ripple out where the pointer moves
 * (and a slightly stronger one on click), like touching the surface of water.
 * Deliberately subtle. Canvas 2D at 1x, no blur or shadows, and the loop
 * sleeps as soon as the last ripple has faded. Fine pointers only.
 */
export function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type Ripple = { x: number; y: number; r: number; max: number; a: number };
    const ripples: Ripple[] = [];
    const SPACING = 46; // px of travel between ripples
    let last: { x: number; y: number } | null = null;
    let raf = 0;
    let running = false;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    canvas.style.display = "none";

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = ripples.length - 1; i >= 0; i--) {
        const p = ripples[i]!;
        p.r += (p.max - p.r) * 0.06 + 0.25;
        const k = Math.min(1, p.r / p.max);
        const alpha = p.a * (1 - k) * (1 - k);
        if (alpha < 0.004) {
          ripples.splice(i, 1);
          continue;
        }
        // Two thin concentric rings read as a water ripple.
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(200, 225, 255, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.92, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (p.r > 10) {
          ctx.strokeStyle = `rgba(200, 225, 255, ${alpha * 0.5})`;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.r * 0.6, p.r * 0.55, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (ripples.length) raf = requestAnimationFrame(draw);
      else {
        running = false;
        canvas.style.display = "none"; // no idle full-screen layer
      }
    };

    const add = (x: number, y: number, max: number, a: number) => {
      ripples.push({ x, y, r: 2, max, a });
      if (ripples.length > 24) ripples.shift();
      if (!running) {
        running = true;
        canvas.style.display = "block";
        raf = requestAnimationFrame(draw);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!last) {
        last = { x: e.clientX, y: e.clientY };
        return;
      }
      if (Math.hypot(e.clientX - last.x, e.clientY - last.y) < SPACING) return;
      last = { x: e.clientX, y: e.clientY };
      add(e.clientX, e.clientY, 38, 0.22);
    };
    const onDown = (e: PointerEvent) => add(e.clientX, e.clientY, 80, 0.4);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[150]" />;
}
