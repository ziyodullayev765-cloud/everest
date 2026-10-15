"use client";

import type { PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Card with a soft bronze light that follows the pointer across it. */
export function GlowCard({ children, className }: { children: ReactNode; className?: string }) {
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--glow-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--glow-y", `${e.clientY - r.top}px`);
    el.style.setProperty("--glow-opacity", "1");
  };
  const onLeave = (e: PointerEvent<HTMLDivElement>) => e.currentTarget.style.setProperty("--glow-opacity", "0");
  return (
    <div className={cn("glow-card", className)} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </div>
  );
}
