/**
 * Achievement catalogue. Rules are data (stored in the `achievements` table and editable by admins);
 * these defaults seed it. Every metric is computed from real learning records, and counts are over
 * distinct assignments / words / days, so resubmitting the same work can never unlock more.
 */
export const ACH_CATEGORIES = [
  { key: "reading", label: "O‘qish", color: "#1ea55a", dark: "#137a40", light: "#e3f6ea" },
  { key: "quiz", label: "Quiz", color: "#8a56e2", dark: "#5f33b0", light: "#efe7fc" },
  { key: "vocab", label: "So‘zlar", color: "#1a96e0", dark: "#0f68a3", light: "#e2f2fc" },
  { key: "grammar", label: "Grammatika", color: "#f59e0b", dark: "#b86e00", light: "#fdf1dc" },
  { key: "activity", label: "Faollik", color: "#14b8a6", dark: "#0b7d72", light: "#dcf6f2" },
] as const;

export type AchCategory = (typeof ACH_CATEGORIES)[number]["key"];
export const categoryOf = (k: string) => ACH_CATEGORIES.find((c) => c.key === k) ?? ACH_CATEGORIES[0];

export const METRICS = {
  lessons_done: { label: "Yakunlangan o‘quv mashqlari (har biri bir marta)", unit: "ta mashq" },
  reading_done: { label: "Yakunlangan Reading mashqlari", unit: "ta reading" },
  listening_done: { label: "Yakunlangan Listening mashqlari", unit: "ta listening" },
  reading_listening_done: { label: "Reading va Listening mashqlari jami", unit: "ta mashq" },
  quizzes_done: { label: "Yakunlangan quizlar (har biri bir marta)", unit: "ta quiz" },
  quizzes_90: { label: "Kamida 90% natija olingan quizlar", unit: "ta quiz" },
  quizzes_100: { label: "100% natija olingan quizlar", unit: "ta quiz" },
  words_learned: { label: "O‘rganilgan so‘zlar (kamida bir marta to‘g‘ri topilgan)", unit: "ta so‘z" },
  words_recalled: { label: "Takrorlashda qayta eslangan so‘zlar (2 xil kunda to‘g‘ri)", unit: "ta so‘z" },
  grammar_topics_done: { label: "Yakunlangan grammatika mavzulari", unit: "ta mavzu" },
  grammar_topics_mastered: { label: "Kamida 80% bilan o‘zlashtirilgan grammatika mavzulari", unit: "ta mavzu" },
  grammar_quizzes_90: { label: "Kamida 90% olingan grammatika testlari", unit: "ta test" },
  tense_quiz_passed: { label: "O‘tilgan zamonlar (tense) testlari", unit: "ta test" },
  streak_best: { label: "Eng uzun ketma-ket kunlar (streak)", unit: "kun" },
  active_days_30: { label: "So‘nggi 30 kundagi faol kunlar", unit: "kun" },
  weeks_goal_met: { label: "Haftalik shaxsiy maqsad bajarilgan haftalar", unit: "hafta" },
  goal_days_30: { label: "So‘nggi 30 kunda kunlik maqsad bajarilgan kunlar", unit: "kun" },
  on_time: { label: "Muddatida topshirilgan vazifalar", unit: "ta vazifa" },
  xp: { label: "To‘plangan XP", unit: "XP" },
  avg_percent_5: { label: "O‘rtacha baho, % (kamida 5 ta baho bo‘lsa)", unit: "%" },
} as const;

export type MetricKey = keyof typeof METRICS;
export type Metrics = Record<MetricKey, number>;
export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

/** Icon names the medal can show (lucide). */
export const MEDAL_ICONS = [
  "Sprout", "BookOpen", "Headphones", "Library", "Compass", "Medal", "Target", "Trophy", "BadgeCheck", "Crown",
  "Type", "BookMarked", "Gem", "Brain", "Star", "PenLine", "GraduationCap", "Zap", "Crosshair", "Award",
  "Flame", "CalendarCheck", "Rocket", "Dumbbell", "Clock", "Sparkles",
] as const;

export type AchievementDef = {
  code: string;
  category: AchCategory;
  title: string;
  description: string;
  icon: string;
  metric: MetricKey;
  threshold: number;
  xpReward: number;
  active: boolean;
  sortOrder: number;
};

const d = (code: string, category: AchCategory, title: string, description: string, icon: string, metric: MetricKey, threshold: number, xpReward: number, sortOrder: number, active = true): AchievementDef => ({
  code, category, title, description, icon, metric, threshold, xpReward, active, sortOrder,
});

export const DEFAULT_ACHIEVEMENTS: AchievementDef[] = [
  d("first_step", "reading", "Birinchi qadam", "Birinchi darsni yakunlang", "Sprout", "lessons_done", 1, 10, 10),
  d("bookworm", "reading", "Kitobxon", "10 ta reading mashqini bajaring", "BookOpen", "reading_done", 10, 50, 20),
  d("listening_pro", "reading", "Listening Pro", "20 ta listening mashqini bajaring", "Headphones", "listening_done", 20, 80, 30),
  d("scholar_rl", "reading", "Bilimdon", "50 ta reading va listening mashqini yakunlang", "Library", "reading_listening_done", 50, 150, 40),
  d("explorer", "reading", "English Explorer", "100 ta o‘quv mashqini yakunlang", "Compass", "lessons_done", 100, 250, 50),

  d("first_win", "quiz", "Birinchi g‘alaba", "Birinchi quizni yakunlang", "Medal", "quizzes_done", 1, 10, 110),
  d("sharp_answer", "quiz", "Aniq javob", "Quizda 90% natijaga erishing", "Target", "quizzes_90", 1, 30, 120),
  d("quiz_master", "quiz", "Quiz Master", "10 ta quizni yakunlang", "Trophy", "quizzes_done", 10, 80, 130),
  d("perfect_score", "quiz", "Perfect Score", "Quizni 100% natija bilan tugating", "BadgeCheck", "quizzes_100", 1, 50, 140),
  d("quiz_legend", "quiz", "Quiz Legend", "20 ta quizda kamida 90% natija oling", "Crown", "quizzes_90", 20, 250, 150),

  d("word_starter", "vocab", "Word Starter", "10 ta so‘zni o‘rganing", "Type", "words_learned", 10, 20, 210),
  d("word_collector", "vocab", "Word Collector", "100 ta so‘zni o‘rganing", "BookMarked", "words_learned", 100, 80, 220),
  d("word_master", "vocab", "Word Master", "500 ta so‘zni o‘rganing", "Gem", "words_learned", 500, 200, 230),
  d("memory_master", "vocab", "Memory Master", "100 ta so‘zni takrorlash testlarida muvaffaqiyatli eslang", "Brain", "words_recalled", 100, 120, 240),
  d("vocab_legend", "vocab", "Vocabulary Legend", "1 000 ta so‘zni o‘rganing", "Star", "words_learned", 1000, 400, 250),

  d("grammar_beginner", "grammar", "Grammar Beginner", "Birinchi grammatik mavzuni tugating", "PenLine", "grammar_topics_done", 1, 10, 310),
  d("grammar_pro", "grammar", "Grammar Pro", "10 ta grammatika mavzusini tugating", "GraduationCap", "grammar_topics_done", 10, 80, 320),
  d("perfect_tense", "grammar", "Perfect Tense", "Zamonlar bo‘yicha testdan o‘ting", "Zap", "tense_quiz_passed", 1, 40, 330),
  d("grammar_expert", "grammar", "Grammar Expert", "5 ta grammatik testda kamida 90% natija oling", "Crosshair", "grammar_quizzes_90", 5, 120, 340),
  d("grammar_legend", "grammar", "Grammar Legend", "20 ta grammatik mavzuni muvaffaqiyatli o‘zlashtiring", "Award", "grammar_topics_mastered", 20, 300, 350),

  d("streak_3", "activity", "3 kunlik streak", "Ketma-ket 3 kun shug‘ullaning", "Flame", "streak_best", 3, 15, 410),
  d("streak_7", "activity", "7 kunlik streak", "Ketma-ket 7 kun shug‘ullaning", "Flame", "streak_best", 7, 50, 420),
  d("consistency", "activity", "Consistency", "30 kun ichida 20 kun mashq qiling", "CalendarCheck", "active_days_30", 20, 120, 430),
  d("fast_learner", "activity", "Fast Learner", "Bir haftalik shaxsiy maqsadni bajaring", "Rocket", "weeks_goal_met", 1, 30, 440),
  d("discipline_master", "activity", "Discipline Master", "30 kunlik rejaning kamida 25 kunini bajaring", "Dumbbell", "goal_days_30", 25, 250, 450),

  // Earlier badges, kept so students who earned them keep them; off by default.
  d("streak_30", "activity", "Temir iroda", "30 kun ketma-ket o‘qing", "Flame", "streak_best", 30, 0, 900, false),
  d("on_time_10", "activity", "Aniqlik ustasi", "10 ta vazifani muddatida topshiring", "Clock", "on_time", 10, 0, 910, false),
  d("xp_500", "activity", "500 XP", "500 XP to‘plang", "Zap", "xp", 500, 0, 920, false),
  d("xp_2000", "activity", "2000 XP", "2000 XP to‘plang", "Gem", "xp", 2000, 0, 930, false),
  d("scholar", "activity", "A’lochi", "Kamida 5 ta bahoda o‘rtacha 86% va undan yuqori", "GraduationCap", "avg_percent_5", 86, 0, 940, false),
];

/** Active achievements whose rule is met. */
export function unlockedCodes(defs: Pick<AchievementDef, "code" | "metric" | "threshold" | "active">[], m: Partial<Metrics>) {
  return defs.filter((a) => a.active && (m[a.metric] ?? 0) >= a.threshold).map((a) => a.code);
}

export function progressOf(a: Pick<AchievementDef, "metric" | "threshold">, m: Partial<Metrics>) {
  const value = Math.max(0, Math.floor(m[a.metric] ?? 0));
  return { value: Math.min(value, a.threshold), target: a.threshold, ratio: a.threshold > 0 ? Math.min(1, value / a.threshold) : 1 };
}

/** Lower-case slug for a new achievement code. */
export function slugCode(title: string) {
  const s = title
    .toLowerCase()
    .replace(/[‘’ʻʼ']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return s || "custom";
}
