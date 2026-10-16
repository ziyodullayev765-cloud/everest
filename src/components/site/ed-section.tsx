"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";

/** Marks the element `data-visible="true"` the first time it scrolls into view. */
export function useRevealOnce(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.dataset.visible = "true";
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.visible = "true";
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/** Section that fades, rises and un-blurs into place the first time it is seen. */
export function EdSection({
  id,
  children,
  className,
  label,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useRevealOnce(ref);
  return (
    <section ref={ref} id={id} aria-label={label} className={cn("ed-section pt-20", className)}>
      {children}
    </section>
  );
}
