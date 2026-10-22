/** Scoring for the vocabulary game — shared by the client (live score) and the server (stored score). */
export const GAME_SECONDS = 12;
export const GAME_ROUND = 12;

export type GameAnswer = { correct: boolean; ms: number };

/** Up to 1000 points per right answer (faster = more), plus a growing streak bonus. */
export function pointsFor(a: GameAnswer, streakBefore: number) {
  if (!a.correct) return 0;
  const speed = Math.max(0, 1 - Math.min(a.ms, GAME_SECONDS * 1000) / (GAME_SECONDS * 1000));
  return 500 + Math.round(500 * speed) + Math.min(streakBefore, 5) * 100;
}

export function gameScore(answers: GameAnswer[]) {
  let streak = 0;
  let best = 0;
  let score = 0;
  for (const a of answers) {
    score += pointsFor(a, streak);
    streak = a.correct ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  return { score, bestStreak: best, correct: answers.filter((a) => a.correct).length };
}
