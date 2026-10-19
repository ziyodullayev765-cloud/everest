"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type Doc = Document & { startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> } };

/** Longest the old page may stay frozen while the next one loads. */
const MAX_WAIT_MS = 350;

/**
 * Smooth page-to-page transitions using the View Transitions API. Internal link
 * clicks run inside `document.startViewTransition`: the old page fades out, and
 * when the clicked link holds a thumbnail (`[data-vt-thumb]`) that image morphs
 * into the next page's hero (`[data-vt-hero]`). Browsers without the API, reduced
 * motion and modified clicks keep the normal instant navigation.
 */
export function PageTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef<(() => void) | null>(null);

  // The new route has committed: let the transition snapshot it.
  useEffect(() => {
    done.current?.();
    done.current = null;
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const doc = document as Doc;
      if (!doc.startViewTransition || e.defaultPrevented || e.button !== 0) return;
      if ((e.target as Element | null)?.closest?.("[data-no-vt]")) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/admin")) return;
      // Same page (or just a #hash): nothing to transition.
      if (url.pathname === location.pathname && url.search === location.search) return;
      // Files and route handlers that are not pages.
      if (/\.(pdf|vcf|xml|txt|png|jpe?g|webp|svg)$/i.test(url.pathname) || url.pathname === "/resume") return;

      e.preventDefault();
      // Morph only when this page has no hero of its own (names must be unique).
      const visible = (el: HTMLElement | null | undefined) => (el?.getClientRects().length ? el : null);
      const thumb = document.querySelector("[data-vt-hero]")
        ? null
        : (visible(a.querySelector<HTMLElement>("[data-vt-thumb]")) ??
          visible(a.closest("article, li")?.querySelector<HTMLElement>("[data-vt-thumb]")) ??
          // Desktop project list: the hovered row's cover sits in a separate sticky frame.
          (a.closest(".project-row")
            ? visible(document.querySelector<HTMLElement>(".project-preview[data-active] [data-vt-thumb]"))
            : null));
      if (thumb) thumb.style.viewTransitionName = "vt-hero";
      const href = url.pathname + url.search + url.hash;

      // The transition now provides the page entrance; skip the CSS one.
      document.documentElement.dataset.vt = "";
      const vt = doc.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, MAX_WAIT_MS);
            done.current = () => {
              clearTimeout(timer);
              // Wait a frame so the new page has painted before it is captured.
              requestAnimationFrame(() => resolve());
            };
            router.push(href);
          }),
      );
      vt.finished.finally(() => {
        if (thumb) thumb.style.viewTransitionName = "";
      });
    };
    // Capture phase, so this runs before next/link's own click handler (which
    // then sees the click as handled and leaves the navigation to us).
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [router]);

  return null;
}
