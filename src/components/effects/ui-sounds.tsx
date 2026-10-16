"use client";

import { useEffect } from "react";

/**
 * A very quiet, synthesised "tick" when a visitor presses a button or link
 * (switched on in Admin → Settings → Appearance). Generated with Web Audio —
 * no sound files — and only ever in response to the visitor's own click.
 */
export function UiSounds({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    let ctx: AudioContext | null = null;
    let lastAt = 0;
    const tick = () => {
      ctx ??= new Ctx();
      const now = ctx.currentTime;
      if (now - lastAt < 0.05) return; // one tick per press
      lastAt = now;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1150, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.06);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    };
    const onPress = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target.closest("a[href], button, [role='button'], [role='tab']") : null;
      if (el && !(el as HTMLButtonElement).disabled) tick();
    };
    window.addEventListener("pointerdown", onPress, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onPress);
      void ctx?.close();
    };
  }, [enabled]);
  return null;
}
