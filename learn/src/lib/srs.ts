/**
 * Spaced repetition (an SM-2 variant). Pure, so it is unit-tested and shared by server code.
 *
 * Grades: 0 again · 1 hard · 2 good · 3 easy.
 * A word is "mastered" only after several consecutive successful reviews spread over weeks
 * (reps ≥ 4 and an interval of at least 21 days) — never after a single correct answer.
 */
export type SrsGrade = 0 | 1 | 2 | 3;
export type SrsState = { ease: number; intervalDays: number; reps: number; lapses: number; state: "learning" | "review" | "mastered" };

export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const MAX_INTERVAL = 365;
export const MASTERED_REPS = 4;
export const MASTERED_INTERVAL = 21;
/** A lapse comes back in the same session. */
export const RELEARN_MINUTES = 10;

export const NEW_STATE: SrsState = { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, state: "learning" };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const r2 = (n: number) => Math.round(n * 100) / 100;

export function schedule(prev: SrsState | null, grade: SrsGrade, now = new Date()): SrsState & { dueAt: Date } {
  const p = prev ?? NEW_STATE;
  if (grade === 0) {
    const next: SrsState = { ease: r2(clamp(p.ease - 0.2, MIN_EASE, MAX_EASE)), intervalDays: 0, reps: 0, lapses: prev && p.reps > 0 ? p.lapses + 1 : p.lapses, state: "learning" };
    return { ...next, dueAt: new Date(now.getTime() + RELEARN_MINUTES * 60_000) };
  }
  const reps = p.reps + 1;
  let ease = p.ease;
  let interval: number;
  if (grade === 1) {
    ease -= 0.15;
    interval = reps === 1 ? 1 : Math.max(1, p.intervalDays * 1.2);
  } else if (grade === 2) {
    interval = reps === 1 ? 1 : reps === 2 ? 3 : p.intervalDays * p.ease;
  } else {
    ease += 0.15;
    interval = reps === 1 ? 3 : reps === 2 ? 6 : p.intervalDays * p.ease * 1.3;
  }
  ease = r2(clamp(ease, MIN_EASE, MAX_EASE));
  interval = r2(clamp(Math.round(interval * 10) / 10, 1, MAX_INTERVAL));
  const state: SrsState["state"] = reps >= MASTERED_REPS && interval >= MASTERED_INTERVAL ? "mastered" : "review";
  return { ease, intervalDays: interval, reps, lapses: p.lapses, state, dueAt: new Date(now.getTime() + interval * 86_400_000) };
}

/** Objective practice modes map a right/wrong answer onto a grade. */
export const gradeFor = (correct: boolean): SrsGrade => (correct ? 2 : 0);

/** Lenient spelling check for typed answers (case, spaces, apostrophes, trailing punctuation). */
export function sameWord(a: string, b: string) {
  const n = (s: string) =>
    s
      .normalize("NFKC")
      .toLocaleLowerCase("en")
      .replace(/[‘’ʻʼ`´]/g, "'")
      .replace(/[.!?]+$/, "")
      .replace(/\s+/g, " ")
      .trim();
  return n(a) !== "" && n(a) === n(b);
}

/** A stored answer like "kitob, daftar" or "colour / color" accepts any of its parts. */
export function matchesAnswer(given: string, stored: string) {
  if (sameWord(given, stored)) return true;
  return stored
    .split(/[,/;]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .some((part) => sameWord(given, part));
}
