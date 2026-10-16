"use client";

import { useEffect } from "react";

/**
 * Two small depth effects, both transform-only and both off under reduced
 * motion:
 *  - Parallax: images marked `data-parallax` (oversized inside their frame)
 *    drift a little slower than the page while scrolling.
 *  - Tilt: cards marked `data-tilt` lean toward a mouse pointer (up to ~5°).
 */
export function MotionEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Parallax ---------------------------------------------------------------
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of document.querySelectorAll<HTMLElement>("[data-parallax]")) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue;
        const offset = (r.top + r.height / 2 - vh / 2) / vh; // -1 … 1 across the screen
        el.style.transform = `translate3d(0, ${(-offset * r.height * 0.06).toFixed(1)}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Cards may scroll sideways in a row, and new pages mount new images.
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    const mo = new MutationObserver(onScroll);
    mo.observe(document.body, { childList: true, subtree: true });

    // Tilt -------------------------------------------------------------------
    const fine = window.matchMedia("(pointer: fine)").matches;
    let tilted: HTMLElement | null = null;
    const reset = () => {
      if (tilted) tilted.style.transform = "";
      tilted = null;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const card = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-tilt]") : null;
      if (card !== tilted) reset();
      if (!card || card.dataset.dragging === "true" || card.closest("[data-dragging='true']")) return;
      tilted = card;
      const r = card.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(1000px) rotateX(${(-dy * 6).toFixed(2)}deg) rotateY(${(dx * 8).toFixed(2)}deg) translateY(-4px)`;
    };
    if (fine) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", reset);
    }

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      reset();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", reset);
    };
  }, []);
  return null;
}
