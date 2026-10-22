import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema, type Executor } from "../db";
import { computeStreak, levelFor } from "@/lib/gamification";
import { localDay } from "@/lib/dates";

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
