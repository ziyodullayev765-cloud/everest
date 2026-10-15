"use client";

import { useEffect, useRef, useState } from "react";
import { DomeGallery, type DomeTileData } from "./dome-gallery";

/**
 * Fixed full-screen dome behind the home page. As you scroll, a veil in the
 * page colour fades over it so the content reads clearly; once the dome is
 * fully covered it stops animating.
 */
export function HomeBackdrop({ tiles, animate = true }: { tiles: DomeTileData[]; animate?: boolean }) {
  const veil = useRef<HTMLDivElement>(null);
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      if (veil.current) veil.current.style.opacity = String(Math.min(y / 500, 0.94));
      setCovered(y > window.innerHeight * 1.5);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0">
        <DomeGallery tiles={tiles} paused={covered || !animate} />
      </div>
      <div ref={veil} aria-hidden className="bg-bg pointer-events-none fixed inset-0 z-[1] opacity-0" />
    </>
  );
}
