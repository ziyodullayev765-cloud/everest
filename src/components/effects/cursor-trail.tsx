"use client";

import { useEffect, useRef } from "react";

/**
 * Glowing rainbow ribbon that follows the pointer and fades out.
 * Canvas 2D, additive blending; the loop sleeps when the trail is empty.
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

    type P = { x: number; y: number; life: number };
    const points: P[] = [];
    const MAX = 46;
    let raf = 0;
    let running = false;
    let hue = 260;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of points) p.life -= 0.022;
      while (points.length && points[0]!.life <= 0) points.shift();

      if (points.length > 2) {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1]!;
          const b = points[i]!;
          const t = i / points.length;
          const h = (hue + i * 4) % 360;
          ctx.strokeStyle = `hsla(${h}, 95%, 65%, ${b.life * 0.85})`;
          ctx.shadowColor = `hsla(${h}, 100%, 60%, ${b.life})`;
          ctx.shadowBlur = 18;
          ctx.lineWidth = Math.max(1, t * 14 * b.life);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          ctx.quadraticCurveTo(a.x, a.y, mx, my);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      hue = (hue + 0.6) % 360;

      if (points.length) raf = requestAnimationFrame(draw);
      else {
        running = false;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    const onMove = (e: PointerEvent) => {
      points.push({ x: e.clientX, y: e.clientY, life: 1 });
      if (points.length > MAX) points.shift();
      if (!running) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[150] mix-blend-screen" />;
}
