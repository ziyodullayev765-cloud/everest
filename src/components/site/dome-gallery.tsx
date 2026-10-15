"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
 * hovered, the sphere spins slowly by itself and can be dragged (with
 * inertia). View-only: photos don't open or enlarge on click. It stops animating when off screen,
 * when the tab is hidden or when `paused`, and is still under reduced motion.
 */
export function DomeGallery({
  tiles,
  segments = 34,
  fit = 0.85,
  maxVerticalDeg = 0,
  offsetY = "10rem",
  mobileFit = 1.35,
  mobileOffsetY = "9rem",
  paused = false,
  autoSpin = true,
  labels = { dome: "Photo dome — drag to rotate" },
}: {
  tiles: DomeTileData[];
  segments?: number;
  /** Radius as a fraction of the container width (capped by its height). */
  fit?: number;
  /** How far the sphere may be tilted by vertical drags (0 = horizontal only). */
  maxVerticalDeg?: number;
  offsetY?: string;
  /** Phones (< 640px wide) use a wider sphere so it still fills the screen. */
  mobileFit?: number;
  mobileOffsetY?: string;
  paused?: boolean;
  autoSpin?: boolean;
  labels?: { dome: string };
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const slots = useMemo(() => layout(tiles, segments), [tiles, segments]);
  const unit = 360 / segments / 2;

  useEffect(() => {
    const root = rootRef.current;
    const sphere = sphereRef.current;
    if (!root || !sphere) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let narrow = false;
    const fitRadius = () => {
      const w = Math.max(1, root.clientWidth);
      const h = Math.max(1, root.clientHeight);
      narrow = w < 640;
      const r = Math.round(Math.max(300, Math.min(w * (narrow ? mobileFit : fit), h * 1.35)));
      root.style.setProperty("--radius", `${r}px`);
      root.style.setProperty("--tile", `${(2 * Math.PI * r) / segments}px`);
    };
    fitRadius();
    const ro = new ResizeObserver(() => {
      fitRadius();
      render();
    });
    ro.observe(root);

    const rot = { x: 0, y: 0 };
    const render = () => {
      sphere.style.transform = `translateY(${narrow ? mobileOffsetY : offsetY}) translateZ(calc(var(--radius) * -1)) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`;
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
    // Past the vertical limit a drag meets growing resistance (at most a few
    // degrees of give) and eases back on release, instead of hitting a wall.
    const soft = (v: number) => {
      const c = clampX(v);
      const over = v - c;
      return c + (over === 0 ? 0 : Math.sign(over) * 4 * (1 - Math.exp(-Math.abs(over) / 12)));
    };

    const tick = (t: number) => {
      const dt = last ? Math.min(48, t - last) : 16;
      last = t;
      if (!dragging) {
        let changed = false;
        // Settle back inside the vertical limit after an over-drag.
        const target = clampX(rot.x);
        if (rot.x !== target) {
          const d = target - rot.x;
          rot.x = Math.abs(d) < 0.02 ? target : rot.x + d * (1 - Math.pow(0.8, dt / 16));
          inertia.x = 0;
          changed = true;
        }
        if (Math.abs(inertia.x) + Math.abs(inertia.y) > 0.002) {
          rot.y += inertia.y * dt;
          const nx = rot.x + inertia.x * dt;
          rot.x = clampX(nx);
          if (rot.x !== nx) inertia.x = 0;
          const k = Math.pow(0.94, dt / 16);
          inertia = { x: inertia.x * k, y: inertia.y * k };
          changed = true;
        } else if (autoSpin && !reduce) {
          rot.y += (AUTO_SPIN_DEG_PER_S * dt) / 1000;
          changed = true;
        }
        if (changed) render();
      }
      const keepGoing =
        visible &&
        !pausedRef.current &&
        !document.hidden &&
        (!reduce || dragging || Math.abs(inertia.y) > 0.002 || rot.x !== clampX(rot.x));
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
      rot.x = soft(start.rx - dy / 20);
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
    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
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
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [fit, mobileFit, segments, maxVerticalDeg, offsetY, mobileOffsetY, autoSpin]);

  return (
    <>
      <div ref={rootRef} className="dome" role="region" aria-label={labels.dome}>
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
        <div className="dome-blur" />
        <div className="dome-vignette" />
        <div className="dome-edge top-0 rotate-180" />
        <div className="dome-edge bottom-0" />
      </div>
    </>
  );
}
