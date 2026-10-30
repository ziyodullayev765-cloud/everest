"use client";
import type { useRouter } from "next/navigation";

/**
 * Client navigation right after a server action can occasionally stall in the router; if the address
 * hasn't changed after a moment, load the page normally so the user never stays stuck.
 */
export function navigate(router: ReturnType<typeof useRouter>, href: string, mode: "push" | "replace" = "push", fallbackMs = 3000) {
  const from = location.pathname + location.search;
  router[mode](href);
  setTimeout(() => {
    // Only if we're still exactly where we were (not on the new page, not somewhere the user went meanwhile).
    if (location.pathname + location.search === from) location.assign(href);
  }, fallbackMs);
}
