"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { copy } from "@/lib/copy";

export interface GalleryItem {
  src: string;
  alt: string;
  caption?: string;
  category?: string;
  width?: number | null;
  height?: number | null;
}

/** Masonry grid + accessible full-screen lightbox (keyboard, swipe, focus return). */
export function ImageGallery({ images }: { images: GalleryItem[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);

  const close = useCallback(() => {
    setIndex((i) => {
      if (i !== null) requestAnimationFrame(() => triggerRefs.current[i]?.focus());
      return null;
    });
  }, []);
  const step = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i === null ? i : (i + dir + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (index === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        // Keep focus within the dialog's controls.
        const dialog = document.getElementById("lightbox");
        const items = Array.from(dialog?.querySelectorAll<HTMLElement>("button") ?? []);
        if (!items.length) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [index, close, step]);

  const current = index !== null ? images[index] : null;

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
        {images.map((img, i) => (
          <li key={`${img.src}-${i}`} className="break-inside-avoid">
            <figure className="group border-line bg-bg-elevated relative overflow-hidden rounded-2xl border">
              <button
                ref={(el) => {
                  triggerRefs.current[i] = el;
                }}
                type="button"
                onClick={() => setIndex(i)}
                className="relative block w-full"
                aria-label={`${copy.gallery.open}: ${img.alt}`}
              >
                <SmartImage
                  src={img.src}
                  alt={img.alt}
                  width={img.width ?? 1200}
                  height={img.height ?? 900}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="ease-out-expo h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <span className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition group-focus-within:opacity-100 group-hover:opacity-100">
                  <Maximize2 className="size-4" aria-hidden />
                </span>
              </button>
              {(img.caption || img.category) && (
                <figcaption className="text-muted px-4 py-3 text-sm">
                  {img.category && (
                    <span className="text-accent mr-2 font-mono text-[0.68rem] tracking-[0.16em] uppercase">{img.category}</span>
                  )}
                  {img.caption}
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {current && index !== null && (
          <motion.div
            id="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={current.alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex flex-col bg-black/95 backdrop-blur-xl"
            onClick={(e) => e.target === e.currentTarget && close()}
            onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              const start = touchX.current;
              const end = e.changedTouches[0]?.clientX;
              if (start !== null && end !== undefined && Math.abs(end - start) > 50) step(end < start ? 1 : -1);
              touchX.current = null;
            }}
          >
            <div className="text-muted flex items-center justify-between p-4 text-sm">
              <span aria-live="polite">
                {index + 1} / {images.length}
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label={copy.gallery.close}
                className="grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20"
              onClick={(e) => e.target === e.currentTarget && close()}
            >
              <motion.div
                key={current.src}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="relative h-full w-full"
              >
                <SmartImage src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" />
              </motion.div>
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label={copy.gallery.prev}
                    className="absolute top-1/2 left-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
                  >
                    <ChevronLeft className="size-6" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label={copy.gallery.next}
                    className="absolute top-1/2 right-2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
                  >
                    <ChevronRight className="size-6" aria-hidden />
                  </button>
                </>
              )}
            </div>
            <p className="text-muted min-h-14 px-6 py-4 text-center text-sm">{current.caption || current.alt}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
