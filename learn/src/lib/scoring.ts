/**
 * Automatic scoring for objective question types. Runs on the server only at submission time;
 * the client never receives `isCorrect`, accepted answers or matching keys before review.
 */
import type { QuestionConfig, QuestionType } from "@/server/db/schema";

export type ScorableQuestion = {
  id: string;
  type: QuestionType;
  points: number;
  config: QuestionConfig;
  options: { id: string; isCorrect: boolean }[];
};

/** Answer shapes the client may send. */
export type Answer =
  | { optionId: string } // single_choice, true_false
  | { optionIds: string[] } // multiple_choice
  | { text: string } // short_answer, essay
  | { blanks: string[] } // fill_blank
  | { matches: Record<string, string> }; // matching: leftPairId -> rightPairId

export type ScoreResult = { isCorrect: boolean | null; points: number | null; needsManual: boolean };

export function normalizeText(s: string, caseSensitive = false) {
  const t = s.normalize("NFKC").trim().replace(/\s+/g, " ").replace(/[‘’ʻʼ`´]/g, "'");
  return caseSensitive ? t : t.toLocaleLowerCase("uz");
}

function matchesAccepted(given: string, accepted: string[] = [], caseSensitive = false) {
  const g = normalizeText(given, caseSensitive);
  if (!g) return false;
  return accepted.some((a) => normalizeText(a, caseSensitive) === g);
}

export function scoreQuestion(q: ScorableQuestion, raw: unknown): ScoreResult {
  const pts = Number(q.points);
  if (q.type === "essay") return { isCorrect: null, points: null, needsManual: true };
  if (raw == null || typeof raw !== "object") return { isCorrect: false, points: 0, needsManual: false };
  const a = raw as Record<string, unknown>;

  switch (q.type) {
    case "single_choice":
    case "true_false": {
      const correct = q.options.find((o) => o.isCorrect);
      const ok = typeof a.optionId === "string" && !!correct && a.optionId === correct.id;
      return { isCorrect: ok, points: ok ? pts : 0, needsManual: false };
    }
    case "multiple_choice": {
      // All-or-nothing: exactly the correct set must be chosen.
      const chosen = Array.isArray(a.optionIds) ? new Set(a.optionIds.filter((x): x is string => typeof x === "string")) : new Set<string>();
      const correct = new Set(q.options.filter((o) => o.isCorrect).map((o) => o.id));
      const ok = chosen.size === correct.size && [...correct].every((id) => chosen.has(id));
      return { isCorrect: ok, points: ok ? pts : 0, needsManual: false };
    }
    case "short_answer": {
      const accepted = q.config.accepted?.[0] ?? [];
      if (accepted.length === 0) return { isCorrect: null, points: null, needsManual: true };
      const ok = typeof a.text === "string" && matchesAccepted(a.text, accepted, q.config.caseSensitive);
      return { isCorrect: ok, points: ok ? pts : 0, needsManual: false };
    }
    case "fill_blank": {
      // Partial credit per blank.
      const accepted = q.config.accepted ?? [];
      if (accepted.length === 0) return { isCorrect: null, points: null, needsManual: true };
      const blanks = Array.isArray(a.blanks) ? a.blanks : [];
      const right = accepted.filter((acc, i) => typeof blanks[i] === "string" && matchesAccepted(blanks[i] as string, acc, q.config.caseSensitive)).length;
      const points = Math.round(((pts * right) / accepted.length) * 100) / 100;
      return { isCorrect: right === accepted.length, points, needsManual: false };
    }
    case "matching": {
      // Partial credit per correct pair. Correct mapping is left.id -> right of the same pair id.
      const pairs = q.config.pairs ?? [];
      if (pairs.length === 0) return { isCorrect: false, points: 0, needsManual: false };
      const m = a.matches && typeof a.matches === "object" ? (a.matches as Record<string, unknown>) : {};
      const right = pairs.filter((p) => m[p.id] === p.id).length;
      const points = Math.round(((pts * right) / pairs.length) * 100) / 100;
      return { isCorrect: right === pairs.length, points, needsManual: false };
    }
  }
}

/** Number of blanks in a fill-in-the-blank prompt, marked with "___" (three or more underscores). */
export function countBlanks(prompt: string) {
  return (prompt.match(/_{3,}/g) ?? []).length;
}

/** Deterministic Fisher–Yates shuffle (seeded), so an attempt keeps its order after reloads. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
