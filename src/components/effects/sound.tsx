"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Background music uploaded in Admin → Settings → Background music.
 * Nothing plays until the visitor presses the header toggle (browsers block
 * autoplay with sound anyway); the choice is remembered for later visits and
 * resumed on the visitor's first interaction. Without a track the toggle is
 * not shown at all.
 */
interface SoundApi {
  on: boolean;
  toggle: () => void;
  title: string;
  available: boolean;
}

const SoundContext = createContext<SoundApi | null>(null);
const STORAGE_KEY = "portfolio-sound";
const VOLUME = 0.5;

export function useSound() {
  return useContext(SoundContext);
}

export function SoundProvider({ musicUrl, title, children }: { musicUrl: string | null; title: string; children: ReactNode }) {
  const [on, setOn] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const fadeRaf = useRef(0);

  const fade = useCallback((to: number, done?: () => void) => {
    const el = audio.current;
    if (!el) return;
    cancelAnimationFrame(fadeRaf.current);
    const from = el.volume;
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 800);
      el.volume = from + (to - from) * k;
      if (k < 1) fadeRaf.current = requestAnimationFrame(step);
      else done?.();
    };
    fadeRaf.current = requestAnimationFrame(step);
  }, []);

  const start = useCallback(() => {
    if (!musicUrl) return;
    if (!audio.current) {
      const el = new Audio(musicUrl);
      el.loop = true;
      el.preload = "none";
      el.volume = 0;
      audio.current = el;
    }
    audio.current
      .play()
      .then(() => {
        fade(VOLUME);
        setOn(true);
      })
      .catch(() => setOn(false));
  }, [musicUrl, fade]);

  const stop = useCallback(() => {
    setOn(false);
    fade(0, () => audio.current?.pause());
  }, [fade]);

  const toggle = useCallback(() => {
    const next = !on;
    try {
      localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {}
    if (next) start();
    else stop();
  }, [on, start, stop]);

  // Returning visitor who left music on: resume on their first interaction.
  useEffect(() => {
    if (!musicUrl) return;
    let wanted = false;
    try {
      wanted = localStorage.getItem(STORAGE_KEY) === "on";
    } catch {}
    if (!wanted) return;
    const resume = () => start();
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [musicUrl, start]);

  // Pause while the tab is hidden.
  useEffect(() => {
    const onVis = () => {
      const el = audio.current;
      if (!el || !on) return;
      if (document.hidden) el.pause();
      else void el.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [on]);

  useEffect(
    () => () => {
      cancelAnimationFrame(fadeRaf.current);
      audio.current?.pause();
    },
    [],
  );

  const api = useMemo(() => ({ on, toggle, title, available: !!musicUrl }), [on, toggle, title, musicUrl]);
  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function SoundToggle({ className }: { className?: string }) {
  const sound = useSound();
  if (!sound?.available) return null;
  const label = sound.on ? "Musiqani o‘chirish" : "Musiqani yoqish";
  return (
    <button
      type="button"
      onClick={sound.toggle}
      aria-pressed={sound.on}
      aria-label={sound.title ? `${label}: ${sound.title}` : label}
      title={sound.title || label}
      className={cn(
        "group grid size-11 place-items-center rounded-full ring-1 ring-white/15 transition hover:ring-white/40",
        className,
      )}
    >
      <span aria-hidden className="flex h-4 items-end gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("bg-rainbow w-[3px] origin-bottom rounded-full", sound.on ? "h-4" : "h-1.5")}
            style={sound.on ? { animation: `eq ${0.7 + i * 0.17}s ease-in-out ${i * 0.1}s infinite` } : undefined}
          />
        ))}
      </span>
    </button>
  );
}
