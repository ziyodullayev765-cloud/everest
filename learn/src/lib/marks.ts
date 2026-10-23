import { tr } from "@/lib/i18n/tr";

/** Lesson marks: a teacher marks each student per skill with 3, 4 or 5 (one mark per skill per day). */
export const MARK_AREAS = [
  { key: "writing", label: "Writing", color: "#36423b" },
  { key: "reading", label: "Reading", color: "#a8650c" },
  { key: "listening", label: "Listening", color: "#c03a33" },
  { key: "speaking", label: "Speaking", color: "#d1477a" },
  { key: "grammar", get label() { return tr("Grammatika"); }, color: "#0f7a5a" },
  { key: "vocabulary", get label() { return tr("Lug‘at"); }, color: "#2f64c8" },
  { key: "translation", get label() { return tr("Tarjima"); }, color: "#6a4fc1" },
  { key: "homework", get label() { return tr("Uy vazifasi"); }, color: "#c0761e" },
] as const;

export type MarkArea = (typeof MARK_AREAS)[number]["key"];
export const MARK_AREA_KEYS = MARK_AREAS.map((a) => a.key) as [MarkArea, ...MarkArea[]];
export const markAreaOf = (k: string) => MARK_AREAS.find((a) => a.key === k) ?? MARK_AREAS[0];

export const MARKS = [
  { value: 3, get label() { return tr("Bajarmagan"); }, tone: "danger" },
  { value: 4, get label() { return tr("Yaxshi"); }, tone: "info" },
  { value: 5, get label() { return tr("A’lo"); }, tone: "success" },
] as const;
export type MarkValue = (typeof MARKS)[number]["value"];
export const markLabel = (v: number) => MARKS.find((m) => m.value === v)?.label ?? String(v);

export const MARK_STYLE: Record<number, string> = {
  3: "bg-danger-soft text-danger border-danger/40",
  4: "bg-info-soft text-info border-info/40",
  5: "bg-success-soft text-success border-success/40",
};
