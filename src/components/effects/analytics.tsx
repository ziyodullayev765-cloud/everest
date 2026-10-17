"use client";

import { useEffect } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { trackEvent } from "@/lib/client/track";
import { SpeedInsights } from "@vercel/speed-insights/next";

/** Admin pages are private: never counted. Query strings are stripped (they can hold tokens). */
function scrub<T extends { url: string }>(event: T): T | null {
  const url = new URL(event.url);
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return null;
  url.search = "";
  return { ...event, url: url.toString() };
}

/**
 * One click listener for the whole site: CV downloads, outgoing links and any
 * element marked data-track="Event name" become custom analytics events.
 */
function useClickTracking() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("a, button, [data-track]");
      if (!el || location.pathname.startsWith("/admin")) return;
      const label = (el.dataset.track ? el.dataset.track : "") || "";
      if (label) return trackEvent(label, { page: location.pathname });
      if (!(el instanceof HTMLAnchorElement) || !el.href) return;
      const url = new URL(el.href, location.href);
      if (url.pathname === "/resume" || url.pathname === "/cv.pdf") return trackEvent("CV download", { page: location.pathname });
      if (url.protocol === "mailto:") return trackEvent("Email click", { page: location.pathname });
      if (url.origin !== location.origin && /^https?:$/.test(url.protocol))
        trackEvent("Outbound link", { host: url.hostname, page: location.pathname });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
}

/** `enabled` is false outside Vercel, where the analytics scripts do not exist. */
export function SiteAnalytics({ enabled = true }: { enabled?: boolean }) {
  useClickTracking();
  if (!enabled) return null;
  return (
    <>
      <Analytics beforeSend={(e: BeforeSendEvent) => scrub(e)} />
      <SpeedInsights beforeSend={(e) => scrub(e)} />
    </>
  );
}
