"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Background sound. Plays the track uploaded in Admin → Settings → Background
 * music, or — if none — a soft ambient pad generated live with the Web Audio
 * API (no file, no licensing). Audio only ever starts from a user gesture,
 * and the visitor's choice is remembered.
 */
interface SoundApi {
  on: boolean;
  toggle: () => void;
  start: () => void;
  stop: () => void;
  tick: () => void;
  title: string;
}

const SoundContext = createContext<SoundApi | null>(null);
const STORAGE_KEY = "portfolio-sound";

export function useSound() {
  return useContext(SoundContext);
}

/* ------------------------------------------------------------------------ */
/* Generative ambient pad                                                    */
/* ------------------------------------------------------------------------ */
const CHORDS = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 392.0], // G
];

function createAmbient(ctx: AudioContext, out: AudioNode) {
  const bus = ctx.createGain();
  bus.gain.value = 0.9;

  // Warm low-pass with a slow LFO = gentle "breathing".
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.7;
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.05;
  lfoGain.gain.value = 500;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();

  // Feedback delay for space.
  const delay = ctx.createDelay(2);
  delay.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(out);

  bus.connect(filter);
  filter.connect(out);
  filter.connect(delay);

  let step = 0;
  let stopped = false;
  const CHORD_SECONDS = 7;

  const playChord = () => {
    if (stopped) return;
    const now = ctx.currentTime;
    const chord = CHORDS[step % CHORDS.length]!;
    chord.forEach((freq, i) => {
      for (const [type, detune, level] of [
        ["sine", 0, 0.06],
        ["triangle", 7, 0.025],
      ] as const) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = i === 0 ? freq / 2 : freq;
        osc.detune.value = detune;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(level, now + 2.5);
        g.gain.setValueAtTime(level, now + CHORD_SECONDS - 0.5);
        g.gain.linearRampToValueAtTime(0, now + CHORD_SECONDS + 2.5);
        osc.connect(g).connect(bus);
        osc.start(now);
        osc.stop(now + CHORD_SECONDS + 3);
      }
    });
    // A few soft bell notes on top.
    for (let k = 0; k < 3; k++) {
      const t = now + 1 + k * 2 + Math.random();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = chord[Math.floor(Math.random() * chord.length)]! * 2;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.025, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      osc.connect(g).connect(delay);
      osc.connect(g).connect(bus);
      osc.start(t);
      osc.stop(t + 2.5);
    }
    step++;
  };

  playChord();
  const id = window.setInterval(playChord, CHORD_SECONDS * 1000);

  return () => {
    stopped = true;
    window.clearInterval(id);
    lfo.stop();
    bus.disconnect();
  };
}

/** Smooth volume ramp for the <audio> element (kept off Web Audio to avoid CORS muting). */
function fade(a: HTMLAudioElement, to: number, ms = 1000) {
  const from = a.volume;
  const startT = performance.now();
  const step = (t: number) => {
    const k = Math.min(1, (t - startT) / ms);
    a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ------------------------------------------------------------------------ */

export function SoundProvider({ musicUrl, title, children }: { musicUrl: string | null; title: string; children: ReactNode }) {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const stopAmbientRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTick = useRef(0);

  const ensureContext = useCallback(() => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    void ctxRef.current.resume();
    return { ctx: ctxRef.current, master: masterRef.current! };
  }, []);

  const start = useCallback(() => {
    const { ctx, master } = ensureContext();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(1, ctx.currentTime, 0.6);

    if (musicUrl) {
      if (!audioRef.current) {
        const a = new Audio(musicUrl);
        a.loop = true;
        a.preload = "auto";
        audioRef.current = a;
      }
      const a = audioRef.current;
      a.volume = 0;
      void a.play().catch(() => setOn(false));
      fade(a, 0.55);
    } else if (!stopAmbientRef.current) {
      stopAmbientRef.current = createAmbient(ctx, master);
    }
    setOn(true);
    try {
      localStorage.setItem(STORAGE_KEY, "on");
    } catch {}
  }, [ensureContext, musicUrl]);

  const stop = useCallback(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      if (audioRef.current) fade(audioRef.current, 0);
      window.setTimeout(() => {
        audioRef.current?.pause();
        stopAmbientRef.current?.();
        stopAmbientRef.current = null;
      }, 1200);
    }
    setOn(false);
    try {
      localStorage.setItem(STORAGE_KEY, "off");
    } catch {}
  }, []);

  const toggle = useCallback(() => (on ? stop() : start()), [on, start, stop]);

  /** Tiny interface "tick" for hovers — only while sound is on. */
  const tick = useCallback(() => {
    const ctx = ctxRef.current;
    if (!on || !ctx) return;
    const now = performance.now();
    if (now - lastTick.current < 70) return;
    lastTick.current = now;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400 + Math.random() * 500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.035, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }, [on]);

  // Hover ticks on every interactive element.
  useEffect(() => {
    if (!on) return;
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as HTMLElement | null)?.closest("a, button, [data-cursor]");
      const from = (e.relatedTarget as HTMLElement | null)?.closest?.("a, button, [data-cursor]");
      if (el && el !== from) tick();
    };
    document.addEventListener("pointerover", onOver);
    return () => document.removeEventListener("pointerover", onOver);
  }, [on, tick]);

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVis = () => {
      const ctx = ctxRef.current;
      if (!ctx || !on) return;
      if (document.hidden) {
        audioRef.current?.pause();
        void ctx.suspend();
      } else {
        void ctx.resume();
        void audioRef.current?.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [on]);

  // Returning visitors who chose sound: resume on their first interaction.
  useEffect(() => {
    let pref: string | null = null;
    try {
      pref = localStorage.getItem(STORAGE_KEY);
    } catch {}
    if (pref !== "on" || !sessionStorage.getItem("portfolio-entered")) return;
    const resume = () => start();
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [start]);

  useEffect(
    () => () => {
      stopAmbientRef.current?.();
      audioRef.current?.pause();
      void ctxRef.current?.close();
    },
    [],
  );

  const api = useMemo(() => ({ on, toggle, start, stop, tick, title }), [on, toggle, start, stop, tick, title]);
  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function SoundToggle({ className }: { className?: string }) {
  const sound = useSound();
  if (!sound) return null;
  const label = sound.on ? "Ovozni o‘chirish" : "Ovozni yoqish";
  return (
    <button
      type="button"
      onClick={sound.toggle}
      aria-pressed={sound.on}
      aria-label={label}
      title={sound.title ? `${label} — ${sound.title}` : label}
      data-cursor={sound.on ? "Off" : "On"}
      className={cn(
        "group grid size-11 place-items-center rounded-full ring-1 ring-white/15 transition hover:ring-white/40",
        sound.on && "bg-white/[0.06]",
        className,
      )}
    >
      <span className="flex h-4 items-end gap-[3px]" aria-hidden>
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
