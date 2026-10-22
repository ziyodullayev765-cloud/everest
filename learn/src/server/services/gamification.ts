import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema, type Executor } from "../db";
import { ACHIEVEMENTS, computeStreak, earnedAchievementCodes, levelFor } from "@/lib/gamification";
import { localDay } from "@/lib/dates";
import { notify } from "./notifications";

/** Idempotent XP award: the unique source key makes retries and resubmissions no-ops. */
export async function awardXp(userId: string, amount: number, reason: string, sourceKey: string, ex: Executor = db) {
  if (amount <= 0) return false;
  const rows = await ex
    .insert(schema.xpTransactions)
    .values({ userId, amount: Math.min(1000, Math.round(amount)), reason, sourceKey })
    .onConflictDoNothing()
    .returning({ id: schema.xpTransactions.id });
  return rows.length > 0;
}

export async function xpTotal(userId: string, ex: Executor = db) {
  const r = await ex
    .select({ n: sql<number>`coalesce(sum(${schema.xpTransactions.amount}),0)::int` })
    .from(schema.xpTransactions)
    .where(eq(schema.xpTransactions.userId, userId));
  return r[0]?.n ?? 0;
}

/** Distinct local days with learning activity (submissions, finished quizzes or vocabulary reviews). */
export async function activeDays(userId: string, ex: Executor = db): Promise<string[]> {
  const rows = await ex.execute<{ d: string }>(sql`
    select distinct to_char((ts at time zone 'Asia/Tashkent')::date, 'YYYY-MM-DD') as d from (
      select v.submitted_at as ts from submission_versions v join submissions s on s.id = v.submission_id where s.student_id = ${userId}
      union all
      select submitted_at from quiz_attempts where student_id = ${userId} and submitted_at is not null
      union all
      select reviewed_at from vocab_reviews where student_id = ${userId}
    ) x where ts > now() - interval '400 days'`);
  return rows.map((r) => r.d);
}

export async function streakFor(userId: string, ex: Executor = db) {
  return computeStreak(await activeDays(userId, ex), localDay(new Date()));
}

export async function gamificationSummary(userId: string) {
  const [xp, streak, earned] = await Promise.all([
    xpTotal(userId),
    streakFor(userId),
    db.select().from(schema.userAchievements).where(eq(schema.userAchievements.userId, userId)),
  ]);
  return { xp, level: levelFor(xp), streak, earned };
}

/** Re-evaluates achievement rules from real records and stores any newly earned badges. */
export async function evaluateAchievements(userId: string) {
  const stats = await db.execute<{
    submissions: number;
    on_time: number;
    quizzes: number;
    perfect: number;
    graded: number;
    avg: string | null;
  }>(sql`
    select
      (select count(*)::int from submissions where student_id = ${userId} and version > 0) as submissions,
      (select count(*)::int from submissions where student_id = ${userId} and version > 0 and not is_late) as on_time,
      (select count(*)::int from quiz_attempts where student_id = ${userId} and status <> 'in_progress') as quizzes,
      (select count(*)::int from quiz_attempts where student_id = ${userId} and status <> 'in_progress' and score is not null and score >= max_score) as perfect,
      (select count(*)::int from grades where student_id = ${userId}) as graded,
      (select avg(percent) from grades where student_id = ${userId}) as avg`);
  const s = stats[0];
  const [xp, streak] = await Promise.all([xpTotal(userId), streakFor(userId)]);
  const codes = earnedAchievementCodes({
    submissions: s.submissions,
    onTimeSubmissions: s.on_time,
    quizzes: s.quizzes,
    perfectQuizzes: s.perfect,
    streakBest: streak.best,
    xp,
    gradedCount: s.graded,
    averagePercent: s.avg == null ? null : Number(s.avg),
  });
  if (codes.length === 0) return [];
  const inserted = await db
    .insert(schema.userAchievements)
    .values(codes.map((code) => ({ userId, code })))
    .onConflictDoNothing()
    .returning({ code: schema.userAchievements.code });
  for (const { code } of inserted) {
    const def = ACHIEVEMENTS.find((a) => a.code === code);
    if (def) await notify([userId], { type: "system", title: `Yangi yutuq: ${def.title}`, body: def.description, link: "/achievements", dedupeKey: `ach:${code}` });
  }
  return inserted.map((i) => i.code);
}

export async function hasAchievement(userId: string, code: string) {
  const r = await db
    .select()
    .from(schema.userAchievements)
    .where(and(eq(schema.userAchievements.userId, userId), eq(schema.userAchievements.code, code)));
  return r.length > 0;
}
