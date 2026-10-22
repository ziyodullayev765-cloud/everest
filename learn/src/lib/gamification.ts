import { tr } from "@/lib/i18n/tr";
/**
 * Transparent XP rules. XP is motivational only and is stored in a separate ledger — it never
 * touches grades. Every award has a unique source key, so retries and resubmissions cannot repeat it.
 */
export type XpRules = {
  submitOnTime: number;
  submitLate: number;
  quizCompleted: number;
  quizPerTenPercent: number;
  quizPerfectBonus: number;
  materialRead: number;
};

export const DEFAULT_XP_RULES: XpRules = {
  submitOnTime: 20,
  submitLate: 10,
  quizCompleted: 10,
  quizPerTenPercent: 1,
  quizPerfectBonus: 15,
  materialRead: 5,
};

export const XP_RULE_LABELS: Record<keyof XpRules, string> = {
  get submitOnTime() { return tr("Vazifani muddatida topshirish (har bir vazifa uchun bir marta)"); },
  get submitLate() { return tr("Vazifani kechikib topshirish (bir marta)"); },
  get quizCompleted() { return tr("Quizni birinchi marta yakunlash"); },
  get quizPerTenPercent() { return tr("Birinchi urinishdagi har 10% natija uchun"); },
  get quizPerfectBonus() { return tr("Birinchi urinishda 100% natija bonusi"); },
  get materialRead() { return tr("O‘quv materialini o‘qib chiqish (bir marta)"); },
};

/** XP awarded for a quiz. Only the first submitted attempt counts, so retakes can't farm XP. */
export function quizXp(rules: XpRules, percent: number, isFirstAttempt: boolean) {
  if (!isFirstAttempt) return 0;
  return rules.quizCompleted + Math.floor(percent / 10) * rules.quizPerTenPercent + (percent >= 100 ? rules.quizPerfectBonus : 0);
}

/** Level n starts at 50·n·(n−1) XP: 0, 100, 300, 600, 1000, … */
export function levelFor(xp: number) {
  const level = Math.floor((1 + Math.sqrt(1 + (8 * Math.max(0, xp)) / 100)) / 2);
  const start = 50 * level * (level - 1);
  const next = 50 * (level + 1) * level;
  return { level, start, next, progress: (xp - start) / (next - start) };
}

/**
 * Streak = consecutive local days with at least one learning activity, ending today
 * (or yesterday, so the streak isn't shown as lost before the day is over).
 */
export function computeStreak(activeDays: string[], today: string): { current: number; best: number } {
  const set = new Set(activeDays);
  const sorted = [...set].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}

export function addDays(isoDay: string, n: number) {
  const d = new Date(isoDay + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
