"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ROUND_MS = 20_000;
const GLYPHS = ["4", "0", "4", "?", "/", "#"];
const BEST_KEY = "lost-letters-best";

interface Drop {
  id: number;
  x: number; // % of width
  y: number; // % of height
  speed: number; // % per second
  glyph: string;
}

export interface GameLabels {
  play: string;
  again: string;
  score: string;
  best: string;
  hint: string;
  time: string;
}

/**
 * A tiny 404 mini-game: the page's characters are falling — tap them before
 * they hit the floor. 20 seconds a round; the best score stays on this device.
 */
export function LostLettersGame({ labels }: { labels: GameLabels }) {
  const [running, setRunning] = useState(false);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [left, setLeft] = useState(ROUND_MS);
  const [played, setPlayed] = useState(false);
  const seq = useRef(0);
  const last = useRef(0);
  const spawnIn = useRef(0);
  const endAt = useRef(0);

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY)) || 0);
    } catch {}
  }, []);

  const stop = useCallback((final: number) => {
    setRunning(false);
    setPlayed(true);
    setDrops([]);
    setBest((b) => {
      const next = Math.max(b, final);
      try {
        localStorage.setItem(BEST_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const tick = (t: number) => {
      const dt = last.current ? Math.min(0.05, (t - last.current) / 1000) : 0;
      last.current = t;
      const remaining = endAt.current - performance.now();
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        setScore((s) => {
          stop(s);
          return s;
        });
        return;
      }
      spawnIn.current -= dt;
      setDrops((ds) => {
        const moved = ds.map((d) => ({ ...d, y: d.y + d.speed * dt })).filter((d) => d.y < 105);
        if (spawnIn.current <= 0) {
          // Faster and more frequent as the round goes on.
          const progress = 1 - remaining / ROUND_MS;
          spawnIn.current = 0.75 - progress * 0.45;
          moved.push({
            id: ++seq.current,
            x: 6 + Math.random() * 88,
            y: -8,
            speed: 22 + progress * 30 + Math.random() * 10,
            glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!,
          });
        }
        return moved;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, stop]);

  const start = () => {
    setScore(0);
    setDrops([]);
    last.current = 0;
    spawnIn.current = 0;
    endAt.current = performance.now() + ROUND_MS;
    setLeft(ROUND_MS);
    setRunning(true);
  };

  const catchDrop = (id: number) => {
    setDrops((ds) => ds.filter((d) => d.id !== id));
    setScore((s) => s + 1);
  };

  return (
    <div className="mt-12 w-full max-w-xl">
      <div className="text-muted mb-2 flex items-center justify-between text-xs tracking-[0.14em] uppercase tabular-nums">
        <span>
          {labels.score}: <span className="text-fg">{score}</span>
        </span>
        {running && (
          <span>
            {labels.time}: <span className="text-fg">{Math.ceil(left / 1000)}</span>
          </span>
        )}
        <span>
          {labels.best}: <span className="text-fg">{best}</span>
        </span>
      </div>
      <div
        className="border-line relative h-64 overflow-hidden rounded-3xl border bg-[color-mix(in_oklab,var(--fg)_3%,transparent)] select-none"
        aria-live="polite"
      >
        {running ? (
          drops.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-label={d.glyph}
              onPointerDown={(e) => {
                e.preventDefault();
                catchDrop(d.id);
              }}
              className="font-display absolute grid size-11 -translate-x-1/2 place-items-center rounded-full text-3xl text-[var(--name-tint)] italic transition-transform hover:scale-110"
              style={{ left: `${d.x}%`, top: `${d.y}%` }}
            >
              {d.glyph}
            </button>
          ))
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            {played && (
              <p className="font-display text-5xl text-[var(--name-tint)] italic" data-testid="game-score">
                {score}
              </p>
            )}
            <p className="text-muted text-sm">{labels.hint}</p>
            <button
              type="button"
              onClick={start}
              className="rounded-full border border-[var(--fg)] bg-[var(--fg)] px-5 py-2.5 text-sm font-semibold text-[var(--bg)] transition hover:opacity-85"
            >
              {played ? labels.again : labels.play}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
