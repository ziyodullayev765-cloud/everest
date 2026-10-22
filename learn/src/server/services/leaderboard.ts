import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { isAdmin, isStudent, type Actor } from "../auth/rbac";
import { forbidden } from "../errors";
import { manageableClassIds, studentClassIds } from "./access";
import { notify } from "./notifications";
import { getSettings } from "./settings";
import { addDays } from "@/lib/gamification";
import { localDay, weekStart } from "@/lib/dates";
import { tr } from "@/lib/i18n/tr";

const TZ = "Asia/Tashkent";
/** Correct word reviews count 1 point each, at most this many per day. */
export const REVIEW_POINTS_PER_DAY = 50;

/** Monday (YYYY-MM-DD) of the current week in Tashkent and the Monday before it. */
export function currentWeek(now = new Date()) {
  const start = weekStart(localDay(now));
  return { start, end: addDays(start, 7), prev: addDays(start, -7) };
}
const startOf = (day: string) => new Date(`${day}T00:00:00+05:00`);

export type RankRow = { studentId: string; name: string; avatarFileId: string | null; score: number; place: number };

/**
 * Weekly score in a group: XP earned that week (owner bonuses excluded) plus correct word reviews (capped per day).
 * Students who turned game elements off are not ranked. Equal scores share a place (1, 1, 3…).
 */
export async function groupRanking(classId: string, week: string): Promise<RankRow[]> {
  const from = startOf(week), to = startOf(addDays(week, 7));
  const rows = await db.execute<{ id: string; name: string; avatar: string | null; score: number; place: number }>(sql`
    with members as (
      select u.id, u.display_name as name, u.avatar_file_id as avatar from class_students cs join users u on u.id = cs.student_id
      where cs.class_id = ${classId} and u.role = 'student' and u.status = 'active' and u.gamification_enabled
    ),
    xp as (
      select user_id, sum(amount)::int as n from xp_transactions
      where created_at >= ${from.toISOString()} and created_at < ${to.toISOString()} and source_key not like 'owner%'
        and user_id in (select id from members) group by 1
    ),
    rv as (
      select student_id, sum(least(c, ${REVIEW_POINTS_PER_DAY}))::int as n from (
        select student_id, (reviewed_at at time zone ${TZ})::date as d, count(*) filter (where correct) as c from vocab_reviews
        where reviewed_at >= ${from.toISOString()} and reviewed_at < ${to.toISOString()} and student_id in (select id from members) group by 1, 2
      ) x group by 1
    ),
    scored as (select m.*, greatest(0, coalesce(xp.n, 0) + coalesce(rv.n, 0))::int as score from members m left join xp on xp.user_id = m.id left join rv on rv.student_id = m.id)
    select *, (rank() over (order by score desc))::int as place from scored order by score desc, name`);
  return rows.map((r) => ({ studentId: r.id, name: r.name, avatarFileId: r.avatar, score: r.score, place: r.place }));
}

/** Awards medals for a finished week (places 1–3 with a score above 0). Idempotent; notifies winners once. */
export async function finalizeWeek(week: string) {
  const { start } = currentWeek();
  if (week >= start) return 0; // the week isn't over yet
  const settings = await getSettings();
  if (!settings.gamification.enabled) return 0;
  const classes = await db.select({ id: schema.classes.id, name: schema.classes.name }).from(schema.classes).where(sql`${schema.classes.archivedAt} is null`);
  let n = 0;
  for (const c of classes) {
    const done = await db.select({ x: sql`1` }).from(schema.weeklyMedals).where(and(eq(schema.weeklyMedals.classId, c.id), eq(schema.weeklyMedals.weekStart, week))).limit(1);
    if (done.length) continue;
    const winners = (await groupRanking(c.id, week)).filter((r) => r.place <= 3 && r.score > 0);
    if (!winners.length) continue;
    const inserted = await db
      .insert(schema.weeklyMedals)
      .values(winners.map((w) => ({ classId: c.id, weekStart: week, studentId: w.studentId, place: w.place, score: w.score })))
      .onConflictDoNothing()
      .returning({ studentId: schema.weeklyMedals.studentId, place: schema.weeklyMedals.place });
    for (const w of inserted) {
      const medal = ["", "🥇", "🥈", "🥉"][w.place];
      await notify([w.studentId], {
        type: "system",
        title: `${medal} ${c.name}: ${w.place}-o‘rin`,
        body: "O‘tgan haftada guruhingizda shu o‘rinni egalladingiz. Tabriklaymiz!",
        link: `/leaderboard?g=${c.id}`,
        dedupeKey: `medal:${c.id}:${week}`,
      });
      n++;
    }
  }
  return n;
}

let finalizedFor: string | null = null;
/** Makes sure last week's medals exist (cheap after the first call per week and process). */
export async function ensureLastWeekFinalized() {
  const { prev } = currentWeek();
  if (finalizedFor === prev) return;
  await finalizeWeek(prev);
  finalizedFor = prev;
}

export async function medalCounts(studentId: string) {
  const r = await db.execute<{ place: number; n: number }>(sql`select place, count(*)::int as n from weekly_medals where student_id = ${studentId} group by place`);
  const m = { gold: 0, silver: 0, bronze: 0 };
  for (const x of r) {
    if (x.place === 1) m.gold = x.n;
    if (x.place === 2) m.silver = x.n;
    if (x.place === 3) m.bronze = x.n;
  }
  return m;
}

export async function weekWinners(classId: string, week: string) {
  return db
    .select({ studentId: schema.weeklyMedals.studentId, place: schema.weeklyMedals.place, score: schema.weeklyMedals.score, name: schema.users.displayName })
    .from(schema.weeklyMedals)
    .innerJoin(schema.users, eq(schema.users.id, schema.weeklyMedals.studentId))
    .where(and(eq(schema.weeklyMedals.classId, classId), eq(schema.weeklyMedals.weekStart, week)))
    .orderBy(schema.weeklyMedals.place, desc(schema.weeklyMedals.score));
}

/** Groups the viewer may see a ranking for: a student's own groups, a teacher's groups, all for admins. */
export async function rankingGroups(actor: Actor) {
  const ids = isStudent(actor) ? await studentClassIds(actor.id) : await manageableClassIds(actor);
  if (!ids || (Array.isArray(ids) && !ids.length)) return [];
  const all = await db.select({ id: schema.classes.id, name: schema.classes.name, level: schema.classes.level }).from(schema.classes).where(sql`${schema.classes.archivedAt} is null`).orderBy(schema.classes.name);
  return ids === "all" ? all : all.filter((c) => (ids as string[]).includes(c.id));
}

export async function leaderboardView(actor: Actor, classId?: string) {
  const settings = await getSettings();
  if (!settings.gamification.enabled) return null;
  await ensureLastWeekFinalized();
  const groups = await rankingGroups(actor);
  if (!groups.length) return { groups, group: null, rows: [], last: [], week: currentWeek() };
  const group = groups.find((g) => g.id === classId) ?? groups[0];
  if (classId && group.id !== classId && !isAdmin(actor)) throw forbidden();
  const week = currentWeek();
  const [rows, last] = await Promise.all([groupRanking(group.id, week.start), weekWinners(group.id, week.prev)]);
  return { groups, group, rows, last, week };
}

/** A student's place in each of their groups this week (for the home and profile pages). */
export async function myPlaces(studentId: string) {
  const week = currentWeek();
  const ids = await studentClassIds(studentId);
  const out: { classId: string; name: string; place: number | null; of: number; score: number }[] = [];
  for (const id of ids) {
    const [c] = await db.select({ name: schema.classes.name, archived: schema.classes.archivedAt }).from(schema.classes).where(eq(schema.classes.id, id));
    if (!c || c.archived) continue;
    const rows = await groupRanking(id, week.start);
    const me = rows.find((r) => r.studentId === studentId);
    out.push({ classId: id, name: c.name, place: me?.place ?? null, of: rows.length, score: me?.score ?? 0 });
  }
  return out;
}

export const placeLabel = (p: number) => tr("{0}-o‘rin", p);
