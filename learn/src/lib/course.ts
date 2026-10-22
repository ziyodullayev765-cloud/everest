/**
 * The course is English only. The `subjects` table is reused as the fixed list of English
 * assignment categories (seeded by migration 0003); these codes are the source of truth.
 */
export const CATEGORIES = [
  { code: "GRAMMAR", name: "Grammatika", color: "#0f7a5a", area: "grammar" },
  { code: "VOCAB", name: "Lug‘at", color: "#2f64c8", area: "vocabulary" },
  { code: "TR_EN_UZ", name: "Tarjima: EN → UZ", color: "#6a4fc1", area: "translation" },
  { code: "TR_UZ_EN", name: "Tarjima: UZ → EN", color: "#8a4fc1", area: "translation" },
  { code: "READING", name: "Reading", color: "#a8650c", area: "reading" },
  { code: "LISTENING", name: "Listening", color: "#c03a33", area: "listening" },
  { code: "SENTENCE", name: "Gap tuzish", color: "#17804a", area: "grammar" },
  { code: "WRITING", name: "Writing", color: "#36423b", area: "writing" },
  { code: "MCQ", name: "Variantli test", color: "#2f8fc8", area: "other" },
  { code: "FILL", name: "Bo‘sh joyni to‘ldirish", color: "#4f7a0f", area: "grammar" },
  { code: "MATCH", name: "So‘z va ma’noni moslash", color: "#c0761e", area: "vocabulary" },
  { code: "IRREG", name: "Noto‘g‘ri fe’llar", color: "#9a3f7a", area: "grammar" },
  { code: "CUSTOM", name: "Boshqa mashq", color: "#66726b", area: "other" },
] as const;

export type CategoryCode = (typeof CATEGORIES)[number]["code"];
export type Area = (typeof CATEGORIES)[number]["area"];
export const CATEGORY_CODES = CATEGORIES.map((c) => c.code) as string[];

export const AREAS: { key: Area; label: string }[] = [
  { key: "grammar", label: "Grammatika" },
  { key: "vocabulary", label: "Lug‘at" },
  { key: "reading", label: "Reading" },
  { key: "listening", label: "Listening" },
  { key: "translation", label: "Tarjima" },
  { key: "writing", label: "Writing" },
  { key: "other", label: "Boshqa" },
];

export const areaOf = (code: string | null | undefined): Area => CATEGORIES.find((c) => c.code === code)?.area ?? "other";

/** Suggested course levels. Free text is allowed; these are labels, not certified CEFR results. */
export const LEVELS = ["Beginner (A1)", "Elementary (A2)", "Intermediate (B1)", "Upper-intermediate (B2)", "Advanced (C1)", "IELTS"];

export const GRAMMAR_TOPICS = [
  "Present Simple",
  "Present Continuous",
  "Past Simple",
  "Present Perfect",
  "Future forms",
  "Articles",
  "Prepositions",
  "Modal verbs",
  "Conditionals",
  "Passive voice",
  "Reported speech",
  "Comparatives and superlatives",
  "Sentence structure",
];
