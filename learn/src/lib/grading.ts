/** Configurable grading scale. Bands are matched from the highest `min` down. */
export type ScaleBand = { min: number; label: string; name: string };

export const DEFAULT_SCALE: ScaleBand[] = [
  { min: 86, label: "5", name: "A’lo" },
  { min: 71, label: "4", name: "Yaxshi" },
  { min: 56, label: "3", name: "Qoniqarli" },
  { min: 0, label: "2", name: "Qoniqarsiz" },
];

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function percentOf(points: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, round2((points / max) * 100)));
}

export function bandFor(percent: number, scale: ScaleBand[] = DEFAULT_SCALE): ScaleBand {
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  return sorted.find((b) => percent >= b.min) ?? sorted[sorted.length - 1];
}

/** Validates an admin-supplied scale: unique labels, a band starting at 0, mins within 0–100. */
export function validateScale(scale: ScaleBand[]): string | null {
  if (scale.length < 2 || scale.length > 12) return "Shkala 2–12 ta oraliqdan iborat bo‘lishi kerak.";
  if (scale.some((b) => b.min < 0 || b.min > 100 || !b.label.trim())) return "Har bir oraliq 0–100 bo‘lishi va belgi bo‘lishi kerak.";
  if (!scale.some((b) => b.min === 0)) return "Shkalada 0 dan boshlanadigan oraliq bo‘lishi kerak.";
  if (new Set(scale.map((b) => b.min)).size !== scale.length) return "Oraliqlar takrorlanmasligi kerak.";
  if (new Set(scale.map((b) => b.label)).size !== scale.length) return "Belgilar takrorlanmasligi kerak.";
  return null;
}

/**
 * Late policy: subtract `penaltyPercent` of the maximum score, never below zero.
 * Returns the penalty in points.
 */
export function latePenalty(points: number, max: number, penaltyPercent: number, isLate: boolean) {
  if (!isLate || penaltyPercent <= 0) return 0;
  return round2(Math.min(points, (max * penaltyPercent) / 100));
}
