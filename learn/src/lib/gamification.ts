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
  submitOnTime: "Vazifani muddatida topshirish (har bir vazifa uchun bir marta)",
  submitLate: "Vazifani kechikib topshirish (bir marta)",
  quizCompleted: "Quizni birinchi marta yakunlash",
  quizPerTenPercent: "Birinchi urinishdagi har 10% natija uchun",
  quizPerfectBonus: "Birinchi urinishda 100% natija bonusi",
  materialRead: "O‘quv materialini o‘qib chiqish (bir marta)",
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

export type AchievementDef = { code: string; title: string; description: string; icon: string; tier: "bronze" | "silver" | "gold" };

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "first_submission", title: "Birinchi qadam", description: "Birinchi vazifani topshirdingiz", icon: "Footprints", tier: "bronze" },
  { code: "first_quiz", title: "Quiz ishqibozi", description: "Birinchi quizni yakunladingiz", icon: "Sparkles", tier: "bronze" },
  { code: "perfect_quiz", title: "Mukammal natija", description: "Quizda 100% natija ko‘rsatdingiz", icon: "Target", tier: "gold" },
  { code: "streak_3", title: "Barqaror start", description: "3 kun ketma-ket o‘qidingiz", icon: "Flame", tier: "bronze" },
  { code: "streak_7", title: "Haftalik odat", description: "7 kun ketma-ket o‘qidingiz", icon: "Flame", tier: "silver" },
  { code: "streak_30", title: "Temir iroda", description: "30 kun ketma-ket o‘qidingiz", icon: "Flame", tier: "gold" },
  { code: "on_time_10", title: "Aniqlik ustasi", description: "10 ta vazifani muddatida topshirdingiz", icon: "Clock", tier: "silver" },
  { code: "xp_500", title: "500 XP", description: "500 XP to‘pladingiz", icon: "Zap", tier: "silver" },
  { code: "xp_2000", title: "2000 XP", description: "2000 XP to‘pladingiz", icon: "Gem", tier: "gold" },
  { code: "scholar", title: "A’lochi", description: "Kamida 5 ta bahoda o‘rtacha 86% va undan yuqori", icon: "GraduationCap", tier: "gold" },
];

export type AchievementStats = {
  submissions: number;
  onTimeSubmissions: number;
  quizzes: number;
  perfectQuizzes: number;
  streakBest: number;
  xp: number;
  gradedCount: number;
  averagePercent: number | null;
};

export function earnedAchievementCodes(s: AchievementStats): string[] {
  const out: string[] = [];
  if (s.submissions >= 1) out.push("first_submission");
  if (s.quizzes >= 1) out.push("first_quiz");
  if (s.perfectQuizzes >= 1) out.push("perfect_quiz");
  if (s.streakBest >= 3) out.push("streak_3");
  if (s.streakBest >= 7) out.push("streak_7");
  if (s.streakBest >= 30) out.push("streak_30");
  if (s.onTimeSubmissions >= 10) out.push("on_time_10");
  if (s.xp >= 500) out.push("xp_500");
  if (s.xp >= 2000) out.push("xp_2000");
  if (s.gradedCount >= 5 && (s.averagePercent ?? 0) >= 86) out.push("scholar");
  return out;
}
