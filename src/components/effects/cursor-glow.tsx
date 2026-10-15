"use client";

import { useEffect, useRef } from "react";

/**
 * A soft bronze light that drifts after the pointer on a damped spring — it
 * lags and settles like something moving through water. Transform-only, one
 * small layer, and the loop sleeps once it has caught up. Fine pointers only.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    // Critically-damped-ish spring: stiffness 100, damping 30, mass 1.
    const K = 100;
    const C = 30;
    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };
    let raf = 0;
    let last = 0;
    let started = false;

    const step = (t: number) => {
      const dt = Math.min(0.032, (t - last) / 1000 || 0.016);
      last = t;
      for (const k of ["x", "y"] as const) {
        const a = K * (target[k] - pos[k]) - C * vel[k];
        vel[k] += a * dt;
        pos[k] += vel[k] * dt;
      }
      el.style.transform = `translate3d(${pos.x - 150}px, ${pos.y - 150}px, 0)`;
      const moving = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) + Math.abs(vel.x) + Math.abs(vel.y) > 0.3;
      raf = moving ? requestAnimationFrame(step) : 0;
    };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!started) {
        started = true;
        pos.x = target.x;
        pos.y = target.y;
        el.style.opacity = "1";
      }
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    };
    const onLeave = () => {
      el.style.opacity = "0";
      started = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      <div
        ref={ref}
        className="absolute top-0 left-0 size-[300px] rounded-full opacity-0 transition-opacity duration-500"
        style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 22%, transparent) 0%, transparent 70%)" }}
      />
    </div>
  );
}
