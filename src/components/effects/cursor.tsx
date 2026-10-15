"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom cursor: a precise dot plus a lagging ring that grows over interactive
 * elements and can show a label (data-cursor="Ko‘rish"). Fine pointers only.
 */
export function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const [active, setActive] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...pos };
    let raf = 0;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!visible) {
        visible = true;
        ringPos.x = pos.x;
        ringPos.y = pos.y;
        dot.current?.style.setProperty("opacity", "1");
        ring.current?.style.setProperty("opacity", "1");
      }
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "a, button, [data-cursor], input, textarea, select, label",
      );
      const text = target?.dataset.cursor ?? "";
      setLabel(text);
      setActive(!!target && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    };
    const onLeave = () => {
      visible = false;
      dot.current?.style.setProperty("opacity", "0");
      ring.current?.style.setProperty("opacity", "0");
    };
    const onDown = () => ring.current?.style.setProperty("--press", "0.8");
    const onUp = () => ring.current?.style.setProperty("--press", "1");

    const tick = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.18;
      ringPos.y += (pos.y - ringPos.y) * 0.18;
      if (dot.current) dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  if (!enabled) return null;
  const big = !!label;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[200]">
      <div ref={dot} className="absolute top-0 left-0 opacity-0" style={{ willChange: "transform" }}>
        <div className="size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white mix-blend-difference" />
      </div>
      <div
        ref={ring}
        className="absolute top-0 left-0 opacity-0 transition-opacity duration-300"
        style={{ willChange: "transform" }}
      >
        <div
          className="grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-[width,height,background-color,border-color] duration-300 ease-out"
          style={{
            width: big ? 96 : active ? 56 : 34,
            height: big ? 96 : active ? 56 : 34,
            transform: "scale(var(--press, 1))",
            border: big ? "none" : "1.5px solid rgba(255,255,255,0.6)",
            background: big
              ? "linear-gradient(135deg, var(--accent), var(--c-pink))"
              : active
                ? "rgba(255,255,255,0.08)"
                : "transparent",
            backdropFilter: active && !big ? "blur(2px)" : undefined,
          }}
        >
          {big && <span className="text-[0.7rem] font-semibold tracking-wide text-white uppercase">{label}</span>}
        </div>
      </div>
    </div>
  );
}
