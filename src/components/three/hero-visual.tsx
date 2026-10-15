"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Pure-CSS stand-in: shown while three.js loads, without WebGL, or when 3D is disabled. */
export function StaticOrb({ className, pulse = false }: { className?: string; pulse?: boolean }) {
  return (
    <div aria-hidden className={cn("relative grid aspect-square w-full place-items-center", className)}>
      <div
        className="absolute inset-[18%] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 65%)" }}
      />
      <div
        className={cn("absolute inset-[22%] rounded-full", pulse && "animate-float-slow")}
        style={{
          background:
            "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.45), rgba(255,255,255,0.06) 18%, #0c0d0e 48%, #050506 72%), radial-gradient(circle at 70% 80%, color-mix(in oklab, var(--accent) 60%, transparent), transparent 55%)",
          boxShadow:
            "inset -18px -24px 60px rgba(0,0,0,0.85), inset 10px 10px 40px rgba(255,255,255,0.06), 0 40px 120px -30px color-mix(in oklab, var(--accent) 50%, transparent)",
        }}
      />
      <div
        className="animate-spin-slow absolute inset-[8%] rounded-full border"
        style={{ borderColor: "color-mix(in oklab, var(--accent) 55%, transparent)", transform: "rotateX(65deg)" }}
      />
      <div className="absolute inset-[2%] rounded-full border border-white/10" />
    </div>
  );
}

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => <StaticOrb pulse />,
});

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function HeroVisual({ accent, enabled, particles }: { accent: string; enabled: boolean; particles: boolean }) {
  const reduceMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"pending" | "3d" | "static">("pending");
  const [visible, setVisible] = useState(true);
  const [lowPower, setLowPower] = useState(false);

  // Decide after mount (never during SSR) so server and client markup match.
  useEffect(() => {
    if (!enabled || !supportsWebGL()) {
      setMode("static");
      return;
    }
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    if (nav.connection?.saveData) {
      setMode("static");
      return;
    }
    const small = window.matchMedia("(max-width: 768px)").matches;
    setLowPower(small || (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4);
    setMode("3d");
  }, [enabled]);

  // Pause the render loop when the hero scrolls out of view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative aspect-square w-full">
      {mode === "3d" ? (
        <div className="absolute inset-0">
          <HeroScene accent={accent} particles={particles} animate={!reduceMotion} active={visible} lowPower={lowPower} />
        </div>
      ) : (
        <StaticOrb pulse={mode === "static" && !reduceMotion} />
      )}
    </div>
  );
}
