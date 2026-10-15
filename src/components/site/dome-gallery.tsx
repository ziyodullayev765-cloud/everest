"use client";

import { useEffect, useMemo, useRef } from "react";

export interface DomeTileData {
  src: string | null;
  alt: string;
  label: string;
}

const SEGMENTS = 34; // tiles around the full circle (each tile spans 2)
const ROWS = [-6, -4, -2, 0, 2, 4, 6]; // vertical offsets, in segment units

/**
 * A sphere of image tiles seen from slightly above — CSS 3D only (no WebGL),
 * so the GPU just transforms flat layers. Drag to spin with inertia; it drifts
 * slowly on its own and pauses when off screen. Images are greyscale until
 * hovered. Tiles without an image show their label instead.
 */
export function DomeGallery({ tiles, paused = false }: { tiles: DomeTileData[]; paused?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const items = useMemo(() => {
    const pool = tiles.length ? tiles : [{ src: null, alt: "", label: "" }];
    const out: { key: string; x: number; y: number; tile: DomeTileData }[] = [];
    let i = 0;
    for (let x = 0; x < SEGMENTS; x += 2) {
      // Brick pattern: odd columns shift by one unit.
      const shift = (x / 2) % 2 ? 1 : 0;
      for (const row of ROWS) {
        out.push({ key: `${x}:${row}`, x, y: row - shift, tile: pool[i % pool.length]! });
        i++;
      }
    }
    return out;
  }, [tiles]);

  useEffect(() => {
    const root = rootRef.current;
    const sphere = sphereRef.current;
    if (!root || !sphere) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Radius follows the viewport so the dome always fills the screen.
    const fit = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      const r = Math.max(380, Math.min(1100, Math.max(w * 0.55, h * 0.8)));
      root.style.setProperty("--radius", `${r}px`);
      // Each tile spans two segments of the circle.
      const tile = ((2 * Math.PI * r) / SEGMENTS) * 2;
      root.style.setProperty("--item-w", `${tile}px`);
      root.style.setProperty("--item-h", `${tile}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);

    let rotY = 0;
    let vel = reduce ? 0 : 0.035; // deg per ms of idle drift
    const IDLE = reduce ? 0 : 0.0035;
    let dragging = false;
    let lastX = 0;
    let lastT = 0;
    let visible = true;
    let raf = 0;
    let prev = performance.now();

    const render = () => {
      sphere.style.transform = `translateY(10rem) translateZ(calc(var(--radius) * -1)) rotateX(-8deg) rotateY(${rotY}deg)`;
    };

    const tick = (t: number) => {
      const dt = Math.min(48, t - prev);
      prev = t;
      if (!dragging) {
        // Inertia decays toward the gentle idle drift.
        vel += (IDLE - vel) * Math.min(1, dt * 0.0025);
        rotY += vel * dt;
        render();
      }
      raf = visible && !pausedRef.current && !document.hidden ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      if (!raf && visible && !pausedRef.current) {
        prev = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      root.dataset.dragging = "true";
      lastX = e.clientX;
      lastT = performance.now();
      vel = 0;
      root.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      rotY += dx * 0.12;
      vel = (dx * 0.12) / Math.max(8, now - lastT);
      lastX = e.clientX;
      lastT = now;
      render();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      root.dataset.dragging = "false";
      vel = Math.max(-0.6, Math.min(0.6, vel));
      wake();
    };

    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      wake();
    });
    io.observe(root);
    const onVis = () => wake();
    document.addEventListener("visibilitychange", onVis);

    render();
    wake();
    const id = window.setInterval(wake, 500); // resumes after `paused` flips back
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const unitDeg = 360 / SEGMENTS;

  return (
    <div ref={rootRef} className="dome" aria-hidden>
      <div className="dome-stage">
        <div ref={sphereRef} className="dome-sphere">
          {items.map(({ key, x, y, tile }) => (
            <div
              key={key}
              className="dome-item"
              style={
                {
                  "--ry": `${unitDeg * (x + 0.5)}deg`,
                  "--rx": `${-unitDeg * y}deg`,
                } as React.CSSProperties
              }
            >
              <div className="dome-tile">
                {tile.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tile.src} alt={tile.alt} loading="lazy" decoding="async" draggable={false} />
                ) : (
                  <span className="font-display text-subtle grid h-full place-items-center p-3 text-center text-[0.65rem] tracking-[0.14em]">
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
  );
}
