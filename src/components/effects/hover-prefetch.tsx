"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";

/** How long a fetched page counts as fresh before hovering fetches it again. */
const FRESH_MS = 30_000;

/**
 * Starts loading a page the moment the pointer rests on (or a finger touches)
 * a link to it, so it is usually ready by the time the click lands. Next.js
 * only prefetches the static shell of dynamic pages; this fetches the whole page.
 */
export function HoverPrefetch() {
  const router = useRouter();

  useEffect(() => {
    const seen = new Map<string, number>();
    const prefetch = (e: Event) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      if (/\.(pdf|vcf|xml|txt|png|jpe?g|webp|svg|webmanifest)$/i.test(url.pathname) || url.pathname === "/resume") return;
      const key = url.pathname + url.search;
      const now = Date.now();
      if (now - (seen.get(key) ?? 0) < FRESH_MS) return;
      seen.set(key, now);
      router.prefetch(key, { kind: "full" as PrefetchKind });
    };
    document.addEventListener("pointerover", prefetch, { passive: true });
    document.addEventListener("touchstart", prefetch, { passive: true });
    document.addEventListener("focusin", prefetch);
    return () => {
      document.removeEventListener("pointerover", prefetch);
      document.removeEventListener("touchstart", prefetch);
      document.removeEventListener("focusin", prefetch);
    };
  }, [router]);

  return null;
}
