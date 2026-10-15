"use client";

import { useEffect, useRef } from "react";

/**
 * Living colourful background: drifting aurora blobs (violet / pink / cyan)
 * that lean gently toward the pointer, a faint grid and film grain. CSS only
 * except a tiny pointer listener; static under reduced motion.
 */
export function Backdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 60;
      target.y = (e.clientY / window.innerHeight - 0.5) * 60;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;
      el.style.setProperty("--px", `${cur.x}px`);
      el.style.setProperty("--py", `${cur.y}px`);
      raf = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.2 ? requestAnimationFrame(tick) : 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-bg absolute inset-0" />
      <div className="absolute inset-0" style={{ transform: "translate3d(var(--px,0), var(--py,0), 0)" }}>
        <div
          className="animate-aurora-a absolute -top-[25%] -left-[10%] h-[70vmax] w-[70vmax] rounded-full opacity-[0.42] blur-[120px]"
          style={{ background: "radial-gradient(circle, var(--accent), transparent 62%)" }}
        />
        <div
          className="animate-aurora-b absolute top-[20%] -right-[20%] h-[60vmax] w-[60vmax] rounded-full opacity-[0.32] blur-[130px]"
          style={{ background: "radial-gradient(circle, var(--c-pink), transparent 62%)" }}
        />
        <div
          className="animate-aurora-a absolute -bottom-[30%] left-[20%] h-[55vmax] w-[55vmax] rounded-full opacity-[0.26] blur-[130px]"
          style={{ background: "radial-gradient(circle, var(--c-cyan), transparent 62%)", animationDelay: "-9s" }}
        />
      </div>
      <div className="grid-backdrop absolute inset-0 opacity-60" />
      <div className="noise absolute inset-0" />
    </div>
  );
}
