"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Eased page scrolling for mouse wheels and trackpads: a fast flick glides to
 * a stop instead of jumping a whole screen. Touch screens keep their native
 * scrolling, and reduced-motion users get plain scrolling.
 */
export function SmoothScroll() {
  const lenis = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const l = new Lenis({
      lerp: 0.075, // lower = slower, softer glide
      wheelMultiplier: 0.75, // each wheel notch travels a little less
      smoothWheel: true,
      syncTouch: false,
      anchors: { offset: -96 },
      autoRaf: true,
    });
    lenis.current = l;
    return () => {
      l.destroy();
      lenis.current = null;
    };
  }, []);

  // A new page starts at the top, without gliding there.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    lenis.current?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
