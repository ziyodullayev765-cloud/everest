"use client";
/**
 * Small synthesized sound effects (Web Audio — no files to download, works offline).
 * Off when the user turns them off in Profile, and silent until the first user gesture (browser rule).
 */
type Sfx = "correct" | "wrong" | "complete" | "tap" | "combo" | "tick" | "start";

const KEY = "sfx";
let ctx: AudioContext | null = null;

export function soundOn() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
}

function audio() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.18) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.02);
}

export function play(s: Sfx) {
  if (!soundOn()) return;
  const c = audio();
  if (!c) return;
  try {
    switch (s) {
      case "correct":
        tone(c, 659.25, 0, 0.12, "triangle");
        tone(c, 987.77, 0.09, 0.22, "triangle");
        break;
      case "wrong":
        tone(c, 220, 0, 0.18, "square", 0.08);
        tone(c, 174.61, 0.14, 0.26, "square", 0.08);
        break;
      case "complete":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, i * 0.11, 0.3, "triangle", 0.16));
        break;
      case "combo":
        [783.99, 987.77, 1318.5].forEach((f, i) => tone(c, f, i * 0.06, 0.16, "sine", 0.14));
        break;
      case "tap":
        tone(c, 880, 0, 0.05, "sine", 0.07);
        break;
      case "tick":
        tone(c, 1200, 0, 0.03, "square", 0.03);
        break;
      case "start":
        tone(c, 392, 0, 0.12, "triangle");
        tone(c, 587.33, 0.1, 0.18, "triangle");
        break;
    }
  } catch {}
}

/** Short vibration on phones that support it (Android). */
export function buzz(ms = 30) {
  try {
    if (soundOn()) navigator.vibrate?.(ms);
  } catch {}
}
