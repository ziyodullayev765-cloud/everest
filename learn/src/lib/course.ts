import { tr } from "@/lib/i18n/tr";
/**
 * The course is English only. The `subjects` table is reused as the fixed list of English
 * assignment categories (seeded by migration 0003); these codes are the source of truth.
 */
export const CATEGORIES = [
  { code: "GRAMMAR", name: "Grammatika", color: "#0f7a5a", area: "grammar" },
  { code: "VOCAB", get name() { return tr("Lug‘at"); }, color: "#2f64c8", area: "vocabulary" },
  { code: "TR_EN_UZ", get name() { return tr("Tarjima: EN → UZ"); }, color: "#6a4fc1", area: "translation" },
  { code: "TR_UZ_EN", get name() { return tr("Tarjima: UZ → EN"); }, color: "#8a4fc1", area: "translation" },
  { code: "READING", name: "Reading", color: "#a8650c", area: "reading" },
  { code: "LISTENING", name: "Listening", color: "#c03a33", area: "listening" },
  { code: "SENTENCE", get name() { return tr("Gap tuzish"); }, color: "#17804a", area: "grammar" },
  { code: "WRITING", name: "Writing", color: "#36423b", area: "writing" },
  { code: "MCQ", get name() { return tr("Variantli test"); }, color: "#2f8fc8", area: "other" },
  { code: "FILL", get name() { return tr("Bo‘sh joyni to‘ldirish"); }, color: "#4f7a0f", area: "grammar" },
  { code: "MATCH", get name() { return tr("So‘z va ma’noni moslash"); }, color: "#c0761e", area: "vocabulary" },
  { code: "IRREG", get name() { return tr("Noto‘g‘ri fe’llar"); }, color: "#9a3f7a", area: "grammar" },
  { code: "CUSTOM", get name() { return tr("Boshqa mashq"); }, color: "#66726b", area: "other" },
] as const;

export type CategoryCode = (typeof CATEGORIES)[number]["code"];
export type Area = (typeof CATEGORIES)[number]["area"];
export const CATEGORY_CODES = CATEGORIES.map((c) => c.code) as string[];

export const AREAS: { key: Area; label: string }[] = [
  { key: "grammar", get label() { return tr("Grammatika"); } },
  { key: "vocabulary", get label() { return tr("Lug‘at"); } },
  { key: "reading", get label() { return tr("Reading"); } },
  { key: "listening", get label() { return tr("Listening"); } },
  { key: "translation", get label() { return tr("Tarjima"); } },
  { key: "writing", get label() { return tr("Writing"); } },
  { key: "other", get label() { return tr("Boshqa"); } },
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
