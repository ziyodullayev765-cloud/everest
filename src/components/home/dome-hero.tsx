"use client";

import { useEffect, useRef, useState } from "react";
import { DomeGallery, type DomeTileData } from "@/components/site/dome-gallery";
import { useCopy } from "@/components/i18n/provider";

/**
 * The full-screen photo dome at the top of the home page. As the page scrolls
 * down it softly blurs, fades and drifts up; once it is gone it stops drawing.
 */
export function DomeHero({ tiles, animate }: { tiles: DomeTileData[]; animate: boolean }) {
  const copy = useCopy();
  const box = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = -1;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, window.scrollY / (vh * 0.75)));
      if (Math.abs(p - last) < 0.004) return;
      last = p;
      el.style.opacity = String(1 - p);
      if (!reduce) {
        el.style.filter = p > 0.01 ? `blur(${(p * 12).toFixed(1)}px)` : "";
        el.style.transform = `translate3d(0, ${(-p * 8).toFixed(2)}vh, 0) scale(${(1 - p * 0.05).toFixed(3)})`;
      }
      el.style.visibility = p >= 1 ? "hidden" : "";
      setGone(p >= 1);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={box} className="absolute inset-0 origin-top will-change-[opacity,transform]">
      <DomeGallery
        tiles={tiles}
        paused={gone || !animate}
        offsetY="5rem"
        mobileOffsetY="10rem"
        labels={{ dome: copy.homePage.domeLabel, close: copy.homePage.close }}
      />
      <div className="dome-hero-fade" aria-hidden />
    </div>
  );
}
