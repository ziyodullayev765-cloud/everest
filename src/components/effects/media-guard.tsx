"use client";

import { useEffect } from "react";

/**
 * Keeps photos on the public site view-only: right-click "Save / Copy image"
 * and dragging an image out are blocked. (Anyone determined can still take a
 * screenshot — this only removes the easy ways.)
 */
export function MediaGuard() {
  useEffect(() => {
    const isMedia = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest("img, picture, video, .dome-tile, .protected-media");
    const block = (e: Event) => {
      if (isMedia(e.target)) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);
  return null;
}
