"use client";

import { useEffect, useRef } from "react";

const MAGNETIC = ".ed-button, .ed-pill, .ed-icon-btn, .music-dock, [data-magnetic]";
const INTERACTIVE = "a, button, [role=button], input, textarea, select, label, [data-cursor]";

/**
 * Pointer effects for mouse / trackpad users (never on touch, never under
 * reduced motion):
 *  - a faint bronze glow and a thin ring that follow the pointer on stiff,
 *    critically damped springs; the ring swells over anything clickable;
 *  - "magnetic" buttons and pills that lean a few pixels toward the pointer.
 * Transform-only, and the loop sleeps once everything has settled.
 */
export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    const ring = ringRef.current;
    if (!glow || !ring) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    const target = { x: 0, y: 0 };
    const springs = [
      { el: glow, k: 900, c: 60, half: 150, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 } },
      { el: ring, k: 1600, c: 80, half: 18, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 } },
    ];
    let scale = 1;
    let scaleTarget = 1;
    let raf = 0;
    let last = 0;
    let started = false;
    let magnet: HTMLElement | null = null;
    let magnetRect: DOMRect | null = null; // its resting box, so the pull doesn't make it slip away

    const step = (t: number) => {
      const dt = Math.min(0.016, (t - last) / 1000 || 0.016); // small steps keep stiff springs stable
      last = t;
      let moving = false;
      for (const s of springs) {
        for (const k of ["x", "y"] as const) {
          const a = s.k * (target[k] - s.pos[k]) - s.c * s.vel[k];
          s.vel[k] += a * dt;
          s.pos[k] += s.vel[k] * dt;
        }
        if (Math.abs(target.x - s.pos.x) + Math.abs(target.y - s.pos.y) + Math.abs(s.vel.x) + Math.abs(s.vel.y) > 0.3)
          moving = true;
      }
      scale += (scaleTarget - scale) * Math.min(1, dt * 14);
      if (Math.abs(scaleTarget - scale) > 0.01) moving = true;
      glow.style.transform = `translate3d(${springs[0]!.pos.x - 150}px, ${springs[0]!.pos.y - 150}px, 0)`;
      ring.style.transform = `translate3d(${springs[1]!.pos.x - 18}px, ${springs[1]!.pos.y - 18}px, 0) scale(${scale.toFixed(3)})`;
      raf = moving ? requestAnimationFrame(step) : 0;
    };
    const kick = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    };

    const release = () => {
      if (magnet) magnet.style.transform = "";
      magnet = null;
      magnetRect = null;
    };
    const near = (r: DOMRect, x: number, y: number) => x > r.left - 10 && x < r.right + 10 && y > r.top - 10 && y < r.bottom + 10;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!started) {
        started = true;
        for (const s of springs) s.pos = { x: target.x, y: target.y };
        glow.style.opacity = "1";
        ring.style.opacity = "1";
      }
      const el = e.target instanceof Element ? e.target : null;
      scaleTarget = el?.closest(INTERACTIVE) ? 1.7 : 1;
      // Magnetic pull: lean the hovered button up to ~6px toward the pointer.
      if (magnet && magnetRect && !near(magnetRect, e.clientX, e.clientY)) release();
      if (!magnet) {
        const m = el?.closest<HTMLElement>(MAGNETIC) ?? null;
        if (m) {
          magnet = m;
          magnetRect = m.getBoundingClientRect();
        }
      }
      if (magnet && magnetRect) {
        const r = magnetRect;
        const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
        magnet.style.transform = `translate(${(dx * 6).toFixed(1)}px, ${(dy * 4).toFixed(1)}px)`;
      }
      kick();
    };
    const onLeave = () => {
      glow.style.opacity = "0";
      ring.style.opacity = "0";
      started = false;
      release();
    };
    const onDown = () => {
      scaleTarget = 0.8;
      kick();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("scroll", release, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      release();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", release);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <div
        ref={glowRef}
        className="absolute top-0 left-0 size-[300px] rounded-full opacity-0 transition-opacity duration-500"
        style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 8%, transparent) 0%, transparent 70%)" }}
      />
      <div ref={ringRef} className="cursor-ring absolute top-0 left-0 size-9 rounded-full opacity-0" />
    </div>
  );
}
