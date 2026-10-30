"use client";
import { useEffect } from "react";

/**
 * Safety net for in-app links: very rarely a client-side page change never finishes and the tap seems to do
 * nothing. If the address hasn't changed a few seconds after tapping a link, load that page normally.
 */
export function NavigationWatchdog() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      const target = url.pathname + url.search;
      const from = location.pathname + location.search;
      if (target === from) return;
      stop();
      const started = Date.now();
      // Watch the address: as soon as it changes once (the page changed, or the user went elsewhere), stop.
      timer = setInterval(() => {
        if (location.pathname + location.search !== from) return stop();
        if (Date.now() - started < 4000) return;
        stop();
        if (document.visibilityState === "visible" && navigator.onLine) location.assign(target);
      }, 200);
    };
    // Capture phase: runs even when the link's own handler stops the event.
    document.addEventListener("click", onClick, true);
    return () => {
      stop();
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}
