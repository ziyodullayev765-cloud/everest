import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { isAdmin, type Actor } from "../auth/rbac";
import { forbidden, invalid, isUniqueViolation, notFound } from "../errors";
import { audit } from "./audit";
import { activeDays, awardXp, xpTotal } from "./gamification";
import { notify } from "./notifications";
import { getSettings } from "./settings";
import { ACH_CATEGORIES, DEFAULT_ACHIEVEMENTS, MEDAL_ICONS, METRIC_KEYS, progressOf, slugCode, unlockedCodes, type AchievementDef, type Metrics } from "@/lib/achievements";
import { addDays, computeStreak } from "@/lib/gamification";
import { localDay } from "@/lib/dates";

const TZ = "Asia/Tashkent";
const GRAMMAR_CODES = sql`('GRAMMAR','SENTENCE','FILL','IRREG')`;

let seeded = false;
/** Inserts the default catalogue once per process; existing rows (and admin edits) are left alone. */
export async function ensureAchievements() {
  if (seeded) return;
  await db
    .insert(schema.achievements)
    .values(DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a })))
    .onConflictDoNothing();
  seeded = true;
}

export async function achievementDefs(opts: { includeInactive?: boolean } = {}) {
  await ensureAchievements();
  const rows = await db
    .select()
    .from(schema.achievements)
    .where(opts.includeInactive ? undefined : eq(schema.achievements.active, true))
    .orderBy(asc(schema.achievements.sortOrder), asc(schema.achievements.title));
  return rows as (typeof rows[number] & AchievementDef)[];
}

/** Every rule input, from real records. Counts are distinct, so redoing one task cannot inflate them. */
export async function studentMetrics(userId: string): Promise<Metrics> {
  const [r] = await db.execute<Record<string, number | string | null>>(sql`
    with done as (
      select assignment_id from submissions where student_id = ${userId} and version > 0
      union
      select assignment_id from quiz_attempts where student_id = ${userId} and status <> 'in_progress'
    ),
    da as (
      select a.id, a.topic, s.code from done join assignments a on a.id = done.assignment_id join subjects s on s.id = a.subject_id
    ),
    qb as (
      select qa.assignment_id, max(100 * qa.score / nullif(qa.max_score, 0)) as best, a.topic, a.passing_percent, s.code
      from quiz_attempts qa join assignments a on a.id = qa.assignment_id join subjects s on s.id = a.subject_id
      where qa.student_id = ${userId} and qa.status <> 'in_progress' and qa.score is not null
      group by qa.assignment_id, a.topic, a.passing_percent, s.code
    ),
    gb as (
      select assignment_id, max(best) as best from (
        select assignment_id, best from qb
        union all
        select assignment_id, percent from grades where student_id = ${userId}
      ) x group by assignment_id
    ),
    firsts as (
      select (min(v.submitted_at) at time zone ${TZ})::date as d from submission_versions v join submissions s on s.id = v.submission_id
        where s.student_id = ${userId} group by s.assignment_id
      union all
      select (min(submitted_at) at time zone ${TZ})::date from quiz_attempts where student_id = ${userId} and status <> 'in_progress' group by assignment_id
    ),
    day_units as (
      select d, sum(n)::int as n from (
        select (v.submitted_at at time zone ${TZ})::date as d, count(*) as n from submission_versions v join submissions s on s.id = v.submission_id
          where s.student_id = ${userId} and v.submitted_at > now() - interval '31 days' group by 1
        union all
        select (submitted_at at time zone ${TZ})::date, count(*) from quiz_attempts
          where student_id = ${userId} and status <> 'in_progress' and submitted_at > now() - interval '31 days' group by 1
        union all
        select (reviewed_at at time zone ${TZ})::date, floor(count(*) / 10.0) from vocab_reviews
          where student_id = ${userId} and reviewed_at > now() - interval '31 days' group by 1
      ) x group by d
    ),
    me as (select weekly_task_goal, daily_goal from users where id = ${userId})
    select
      (select count(*) from da)::int as lessons_done,
      (select count(*) from da where code = 'READING')::int as reading_done,
      (select count(*) from da where code = 'LISTENING')::int as listening_done,
      (select count(*) from da where code in ('READING','LISTENING'))::int as reading_listening_done,
      (select count(*) from qb)::int as quizzes_done,
      (select count(*) from qb where best >= 90)::int as quizzes_90,
      (select count(*) from qb where best >= 100)::int as quizzes_100,
      (select count(distinct word_id) from vocab_reviews where student_id = ${userId} and correct)::int as words_learned,
      (select count(*) from (select word_id from vocab_reviews where student_id = ${userId} and correct
        group by word_id having count(distinct (reviewed_at at time zone ${TZ})::date) >= 2) w)::int as words_recalled,
      (select count(distinct coalesce(nullif(lower(trim(topic)), ''), id::text)) from da where code in ${GRAMMAR_CODES})::int as grammar_topics_done,
      (select count(distinct coalesce(nullif(lower(trim(da.topic)), ''), da.id::text)) from da join gb on gb.assignment_id = da.id
        where da.code in ${GRAMMAR_CODES} and gb.best >= 80)::int as grammar_topics_mastered,
      (select count(*) from qb where code in ${GRAMMAR_CODES} and best >= 90)::int as grammar_quizzes_90,
      (select count(*) from qb where code in ${GRAMMAR_CODES} and best >= passing_percent
        and topic ~* '(tense|present|past|future|perfect|continuous|zamon)')::int as tense_quiz_passed,
      (select count(*) from (select date_trunc('week', d) as w, count(*) as n from firsts group by 1) wk
        where wk.n >= (select weekly_task_goal from me))::int as weeks_goal_met,
      (select count(*) from day_units where d > (now() at time zone ${TZ})::date - 30 and n >= (select daily_goal from me))::int as goal_days_30,
      (select count(*) from submissions where student_id = ${userId} and version > 0 and not is_late)::int as on_time,
      (select case when count(*) >= 5 then avg(percent) else 0 end from grades where student_id = ${userId}) as avg_percent_5`);
  const [days, xp] = await Promise.all([activeDays(userId), xpTotal(userId)]);
  const today = localDay(new Date());
  const since = addDays(today, -29);
  const m = { ...r } as Record<string, number>;
  for (const k of Object.keys(m)) m[k] = Number(m[k] ?? 0);
  return {
    ...(m as unknown as Metrics),
    streak_best: computeStreak(days, today).best,
    active_days_30: days.filter((d) => d >= since).length,
    xp,
  };
}

/**
 * Re-checks the rules against real records and stores newly met achievements. Each unlock gives its
 * XP once (keyed by achievement + student) and a notification; it is idempotent.
 */
export async function evaluateAchievements(userId: string) {
  const [defs, metrics, settings] = await Promise.all([achievementDefs(), studentMetrics(userId), getSettings()]);
  const codes = unlockedCodes(defs, metrics);
  if (!codes.length) return [];
  const inserted = await db
    .insert(schema.userAchievements)
    .values(codes.map((code) => ({ userId, code })))
    .onConflictDoNothing()
    .returning({ code: schema.userAchievements.code });
  for (const { code } of inserted) {
    const a = defs.find((x) => x.code === code)!;
    if (settings.gamification.enabled && a.xpReward > 0) await awardXp(userId, a.xpReward, "achievement", `ach:${code}:${userId}`);
    await notify([userId], { type: "system", title: `Yangi yutuq: ${a.title}`, body: a.description, link: `/achievements/${code}`, dedupeKey: `ach:${code}` });
  }
  return inserted.map((i) => i.code);
}

export type StudentAchievement = AchievementDef & { earnedAt: Date | null; progress: { value: number; target: number; ratio: number } };

/** Catalogue for a student: active rules plus any inactive ones they already earned. */
export async function studentAchievements(userId: string): Promise<{ list: StudentAchievement[]; metrics: Metrics }> {
  const [defs, earned, metrics] = await Promise.all([
    achievementDefs({ includeInactive: true }),
    db.select().from(schema.userAchievements).where(eq(schema.userAchievements.userId, userId)),
    studentMetrics(userId),
  ]);
  const at = new Map(earned.map((e) => [e.code, e.earnedAt]));
  const list = defs
    .filter((a) => a.active || at.has(a.code))
    .map((a) => ({ ...a, earnedAt: at.get(a.code) ?? null, progress: at.has(a.code) ? { value: a.threshold, target: a.threshold, ratio: 1 } : progressOf(a, metrics) }));
  return { list, metrics };
}

export async function recentAchievements(userId: string, limit = 3) {
  await ensureAchievements();
  return db
    .select({ code: schema.achievements.code, title: schema.achievements.title, icon: schema.achievements.icon, category: schema.achievements.category, earnedAt: schema.userAchievements.earnedAt })
    .from(schema.userAchievements)
    .innerJoin(schema.achievements, eq(schema.achievements.code, schema.userAchievements.code))
    .where(eq(schema.userAchievements.userId, userId))
    .orderBy(desc(schema.userAchievements.earnedAt))
    .limit(limit);
}

/** Unlocks the student hasn't been shown yet (for the celebration popup). */
export async function unseenAchievements(userId: string) {
  return db
    .select({ code: schema.achievements.code, title: schema.achievements.title, description: schema.achievements.description, icon: schema.achievements.icon, category: schema.achievements.category, xpReward: schema.achievements.xpReward, earnedAt: schema.userAchievements.earnedAt })
    .from(schema.userAchievements)
    .innerJoin(schema.achievements, eq(schema.achievements.code, schema.userAchievements.code))
    .where(and(eq(schema.userAchievements.userId, userId), isNull(schema.userAchievements.seenAt)))
    .orderBy(asc(schema.userAchievements.earnedAt))
    .limit(5);
}

export async function markAchievementsSeen(userId: string, codes: string[]) {
  if (!codes.length) return;
  await db
    .update(schema.userAchievements)
    .set({ seenAt: new Date() })
    .where(and(eq(schema.userAchievements.userId, userId), isNull(schema.userAchievements.seenAt), inArray(schema.userAchievements.code, codes)));
}

// ---------- admin ----------

const requireAdmin = (a: Actor) => {
  if (!isAdmin(a)) throw forbidden();
};

export const achievementInput = z.object({
  title: z.string().trim().min(2, "Nom kamida 2 ta belgi").max(60),
  description: z.string().trim().max(200).default(""),
  category: z.enum(ACH_CATEGORIES.map((c) => c.key) as [string, ...string[]]),
  icon: z.enum(MEDAL_ICONS as unknown as [string, ...string[]]),
  metric: z.enum(METRIC_KEYS as [string, ...string[]]),
  threshold: z.coerce.number().int().min(1, "Shart kamida 1").max(100000),
  xpReward: z.coerce.number().int().min(0).max(1000),
  active: z.boolean().default(true),
});
export type AchievementInput = z.input<typeof achievementInput>;

export async function adminAchievements(actor: Actor) {
  requireAdmin(actor);
  const defs = await achievementDefs({ includeInactive: true });
  const counts = await db.execute<{ code: string; n: number }>(sql`select code, count(*)::int as n from user_achievements group by code`);
  const n = new Map(counts.map((c) => [c.code, c.n]));
  return defs.map((d) => ({ ...d, earners: n.get(d.code) ?? 0 }));
}

export async function saveAchievement(actor: Actor, code: string | null, raw: AchievementInput) {
  requireAdmin(actor);
  const v = achievementInput.parse(raw);
  await ensureAchievements();
  if (code) {
    const r = await db.update(schema.achievements).set({ ...v, updatedAt: new Date() }).where(eq(schema.achievements.code, code)).returning({ code: schema.achievements.code });
    if (!r.length) throw notFound("Yutuq topilmadi.");
    await audit(actor.id, "achievement.update", "achievement", null, { code });
    return code;
  }
  const base = `c_${slugCode(v.title)}`;
  for (let i = 0; i < 20; i++) {
    const c = i ? `${base}_${i + 1}` : base;
    try {
      await db.insert(schema.achievements).values({ ...v, code: c, sortOrder: 2000 });
      await audit(actor.id, "achievement.create", "achievement", null, { code: c });
      return c;
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  throw invalid("Bu nomdagi yutuqlar juda ko‘p.");
}

export async function setAchievementActive(actor: Actor, code: string, active: boolean) {
  requireAdmin(actor);
  const r = await db.update(schema.achievements).set({ active, updatedAt: new Date() }).where(eq(schema.achievements.code, code)).returning({ code: schema.achievements.code });
  if (!r.length) throw notFound("Yutuq topilmadi.");
  await audit(actor.id, active ? "achievement.enable" : "achievement.disable", "achievement", null, { code });
}

export async function achievementEarners(actor: Actor, code: string) {
  requireAdmin(actor);
  await ensureAchievements();
  const [def] = await db.select().from(schema.achievements).where(eq(schema.achievements.code, code));
  if (!def) throw notFound("Yutuq topilmadi.");
  const rows = await db
    .select({ id: schema.users.id, name: schema.users.displayName, username: schema.users.username, earnedAt: schema.userAchievements.earnedAt })
    .from(schema.userAchievements)
    .innerJoin(schema.users, eq(schema.users.id, schema.userAchievements.userId))
    .where(eq(schema.userAchievements.code, code))
    .orderBy(desc(schema.userAchievements.earnedAt));
  return { def: def as typeof def & AchievementDef, rows };
}
