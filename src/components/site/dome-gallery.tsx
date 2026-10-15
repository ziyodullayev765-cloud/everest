"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { env } from "@/lib/env";

export interface DomeTileData {
  src: string | null;
  alt: string;
  label: string;
}

/** Columns in the even/odd brick rows (each tile spans two half-segments). */
const EVEN_ROWS = [-4, -2, 0, 2, 4];
const ODD_ROWS = [-3, -1, 1, 3, 5];
export const DOME_ROWS = EVEN_ROWS.length;
const AUTO_SPIN_DEG_PER_S = 2.8;

/** Small, cached WebP/AVIF thumbnail through the Next image optimiser (our bucket only). */
function thumb(src: string, width: number) {
  const ours = !!env.supabaseUrl && src.startsWith(env.supabaseUrl) && !/\.(ico|gif)(\?|$)/i.test(src);
  return ours ? `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=70` : src;
}

/** Total tiles for a given segment count — `segments` columns × 5 rows. */
export function domeTileCount(segments = 34) {
  return segments * DOME_ROWS;
}

/*
 * Greyscale copies are made once per image on a canvas. A CSS `filter` on
 * every tile turns each of the ~170 3D layers into its own offscreen render
 * pass on every frame, which is what made scrolling stutter.
 */
const greyCache = new Map<string, Promise<string>>();
function toGrey(url: string): Promise<string> {
  let p = greyCache.get(url);
  if (!p) {
    p = (async () => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("no 2d context");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height); // throws if the image is cross-origin
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const l = px[i]! * 0.2126 + px[i + 1]! * 0.7152 + px[i + 2]! * 0.0722;
        px[i] = px[i + 1] = px[i + 2] = l;
      }
      ctx.putImageData(data, 0, 0);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.82));
      if (!blob) throw new Error("encode failed");
      return URL.createObjectURL(blob);
    })();
    greyCache.set(url, p);
  }
  return p;
}

/**
 * A tile photo: the greyscale copy by default, the colour version fading in on
 * hover (only loaded the first time it is hovered). Images from other hosts,
 * which a canvas may not read, fall back to a CSS greyscale filter.
 */
function TileImage({ src, alt }: { src: string; alt: string }) {
  const url = thumb(src, 256);
  const [grey, setGrey] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [color, setColor] = useState(false);
  useEffect(() => {
    let alive = true;
    toGrey(url).then(
      (g) => alive && setGrey(g),
      () => alive && setFallback(true),
    );
    return () => {
      alive = false;
    };
  }, [url]);
  return (
    <span className="dome-photo" onPointerEnter={() => setColor(true)}>
      {fallback ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="dome-photo-css-grey" decoding="async" draggable={false} />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {grey && <img src={grey} alt={alt} className="dome-photo-grey" draggable={false} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {color && <img src={url} alt="" aria-hidden className="dome-photo-color" decoding="async" draggable={false} />}
        </>
      )}
    </span>
  );
}

interface Slot {
  key: string;
  x: number;
  y: number;
  tile: DomeTileData;
}

/**
 * Lay the pool out column by column and make sure no tile shows the same
 * image as the one above it or beside it, so photos spread across the sphere.
 */
function layout(pool: DomeTileData[], segments: number): Slot[] {
  const coords: { x: number; y: number }[] = [];
  for (let c = 0; c < segments; c++) {
    const x = -segments + 1 + c * 2;
    for (const y of c % 2 ? ODD_ROWS : EVEN_ROWS) coords.push({ x, y });
  }
  const tiles = pool.length ? pool : [{ src: null, alt: "", label: "" }];
  const chosen = coords.map((_, i) => tiles[i % tiles.length]!);
  const same = (a?: DomeTileData, b?: DomeTileData) => !!a && !!b && (a.src ?? a.label) === (b.src ?? b.label);
  if (tiles.length > 2) {
    for (let i = 1; i < chosen.length; i++) {
      if (!same(chosen[i], chosen[i - 1]) && !same(chosen[i], chosen[i - DOME_ROWS])) continue;
      for (let j = i + 1; j < chosen.length; j++) {
        if (!same(chosen[j], chosen[i - 1]) && !same(chosen[j], chosen[i - DOME_ROWS])) {
          [chosen[i], chosen[j]] = [chosen[j]!, chosen[i]!];
          break;
        }
      }
    }
  }
  return coords.map((c, i) => ({ key: `${c.x}:${c.y}`, ...c, tile: chosen[i]! }));
}

/**
 * A sphere of photo tiles (CSS 3D, no WebGL). Images are greyscale until
 * hovered, the sphere spins slowly by itself, can be dragged (with inertia)
 * and a click opens the photo large. It stops animating when off screen,
 * when the tab is hidden or when `paused`, and is still under reduced motion.
 */
export function DomeGallery({
  tiles,
  segments = 34,
  fit = 0.85,
  maxVerticalDeg = 0,
  offsetY = "10rem",
  paused = false,
  autoSpin = true,
}: {
  tiles: DomeTileData[];
  segments?: number;
  /** Radius as a fraction of the container width (capped by its height). */
  fit?: number;
  /** How far the sphere may be tilted by vertical drags (0 = horizontal only). */
  maxVerticalDeg?: number;
  offsetY?: string;
  paused?: boolean;
  autoSpin?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [open, setOpen] = useState<DomeTileData | null>(null);
  const openRef = useRef(false);
  openRef.current = !!open;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const slots = useMemo(() => layout(tiles, segments), [tiles, segments]);
  const unit = 360 / segments / 2;

  useEffect(() => {
    const root = rootRef.current;
    const sphere = sphereRef.current;
    if (!root || !sphere) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const fitRadius = () => {
      const w = Math.max(1, root.clientWidth);
      const h = Math.max(1, root.clientHeight);
      const r = Math.round(Math.max(300, Math.min(w * fit, h * 1.35)));
      root.style.setProperty("--radius", `${r}px`);
      root.style.setProperty("--tile", `${(2 * Math.PI * r) / segments}px`);
    };
    fitRadius();
    const ro = new ResizeObserver(fitRadius);
    ro.observe(root);

    const rot = { x: 0, y: 0 };
    const render = () => {
      sphere.style.transform = `translateY(${offsetY}) translateZ(calc(var(--radius) * -1)) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`;
    };
    render();

    let raf = 0;
    let last = 0;
    let visible = true;
    let dragging = false;
    let inertia = { x: 0, y: 0 };
    let start = { px: 0, py: 0, rx: 0, ry: 0 };
    let moved = false;
    let lastMove = { x: 0, y: 0, t: 0 };
    const clampX = (v: number) => Math.max(-maxVerticalDeg, Math.min(maxVerticalDeg, v));
    let scrollingUntil = 0;
    const onScroll = () => {
      scrollingUntil = performance.now() + 220;
    };

    const tick = (t: number) => {
      const dt = last ? Math.min(48, t - last) : 16;
      last = t;
      if (!dragging) {
        if (Math.abs(inertia.x) + Math.abs(inertia.y) > 0.002) {
          rot.y += inertia.y * dt;
          rot.x = clampX(rot.x + inertia.x * dt);
          const k = Math.pow(0.94, dt / 16);
          inertia = { x: inertia.x * k, y: inertia.y * k };
          render();
        } else if (autoSpin && !reduce && !openRef.current && t > scrollingUntil) {
          // The idle spin rests while the page is being scrolled: moving all the
          // 3D tiles and scrolling in the same frame is what makes pages stutter.
          rot.y += (AUTO_SPIN_DEG_PER_S * dt) / 1000;
          render();
        }
      }
      const keepGoing = visible && !pausedRef.current && !document.hidden && (!reduce || dragging || Math.abs(inertia.y) > 0.002);
      raf = keepGoing ? requestAnimationFrame(tick) : 0;
      if (!raf) last = 0;
    };
    const wake = () => {
      if (!raf && visible && !pausedRef.current && !document.hidden) raf = requestAnimationFrame(tick);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      moved = false;
      inertia = { x: 0, y: 0 };
      start = { px: e.clientX, py: e.clientY, rx: rot.x, ry: rot.y };
      lastMove = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - start.px;
      const dy = e.clientY - start.py;
      if (!moved && dx * dx + dy * dy > 16) {
        moved = true;
        root.dataset.dragging = "true";
        root.setPointerCapture?.(e.pointerId);
      }
      if (!moved) return;
      rot.y = start.ry + dx / 20;
      rot.x = clampX(start.rx - dy / 20);
      const now = performance.now();
      const span = Math.max(8, now - lastMove.t);
      inertia = { y: (e.clientX - lastMove.x) / 20 / span, x: -(e.clientY - lastMove.y) / 20 / span };
      lastMove = { x: e.clientX, y: e.clientY, t: now };
      render();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      root.dataset.dragging = "false";
      inertia = { x: Math.max(-0.5, Math.min(0.5, inertia.x)), y: Math.max(-0.5, Math.min(0.5, inertia.y)) };
      wake();
    };
    // A tap (no drag) on a photo opens it.
    const onClick = (e: MouseEvent) => {
      if (moved) return;
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-tile]");
      const idx = el ? Number(el.dataset.tile) : NaN;
      const tile = Number.isFinite(idx) ? slotsRef.current[idx]?.tile : undefined;
      if (tile?.src) setOpen(tile);
    };

    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    root.addEventListener("click", onClick);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      wake();
    });
    io.observe(root);
    const onVis = () => wake();
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(wake, 400); // picks up `paused` turning off
    wake();

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      root.removeEventListener("click", onClick);
    };
  }, [fit, segments, maxVerticalDeg, offsetY, autoSpin]);

  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const close = useCallback(() => setOpen(null), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <div ref={rootRef} className="dome" role="region" aria-label="Photo dome — drag to rotate, click a photo to enlarge">
        <div className="dome-stage">
          <div ref={sphereRef} className="dome-sphere">
            {slots.map(({ key, x, y, tile }, i) => (
              <div
                key={key}
                className="dome-item"
                style={
                  {
                    "--ry": `${unit * (x + 0.5)}deg`,
                    "--rx": `${unit * (y - 0.5)}deg`,
                  } as React.CSSProperties
                }
              >
                <div className="dome-tile" data-tile={i} data-has-image={tile.src ? "" : undefined}>
                  {tile.src ? (
                    <TileImage src={tile.src} alt={tile.alt} />
                  ) : (
                    <span className="font-display text-subtle grid h-full place-items-center p-3 text-center text-[0.7rem] tracking-[0.08em]">
                      {tile.label}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="dome-vignette" />
        <div className="dome-edge top-0 rotate-180" />
        <div className="dome-edge bottom-0" />
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open?.src && (
              <motion.div
                key="dome-viewer"
                role="dialog"
                aria-modal="true"
                aria-label={open.alt || open.label || "Photo"}
                className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(var(--bg-rgb),0.88)] p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={close}
              >
                <motion.figure
                  className="relative max-h-[85vh] max-w-[min(92vw,1100px)]"
                  initial={{ scale: 0.86, y: 12 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb(open.src, 1200)}
                    alt={open.alt}
                    className="max-h-[80vh] w-auto rounded-[28px] object-contain shadow-[var(--shadow-hover)]"
                  />
                  {(open.label || open.alt) && (
                    <figcaption className="mt-3 text-center text-sm text-[var(--fg-secondary)]">
                      {open.label || open.alt}
                    </figcaption>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="ed-icon-btn ed-glass absolute -top-3 -right-3"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </motion.figure>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
