import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db";
import type { Actor } from "../auth/rbac";
import { isDone } from "@/lib/assignment-kinds";
import { addDays } from "@/lib/gamification";
import { lastNDays, localDay, weekStart } from "@/lib/dates";
import { round2 } from "@/lib/grading";
import { listForStudent, type StudentAssignmentRow } from "./assignments";
import { gamificationSummary } from "./gamification";
import { manageableAssignmentsWhere, manageableClassIds } from "./access";
import { notify } from "./notifications";
import { fillTemplate, getSettings } from "./settings";

const TZ = sql.raw(`'Asia/Tashkent'`);
/** postgres.js can't bind Date objects inside raw sql templates — pass ISO strings. */
const tsz = (d: Date) => sql`${d.toISOString()}::timestamptz`;

type DayRow = { day: string; tasks: number; quizzes: number; avg: number | null };

/** Per-day activity for a student between two local dates (inclusive). Only real records. */
async function dailyActivity(studentId: string, from: string, to: string): Promise<Map<string, DayRow>> {
  const rows = await db.execute<{ day: string; tasks: number; quizzes: number; avg: string | null }>(sql`
    with days as (select generate_series(${from}::date, ${to}::date, interval '1 day')::date as d),
    t as (
      select (s.submitted_at at time zone ${TZ})::date as d, count(*)::int as n from submissions s
      where s.student_id = ${studentId} and s.version > 0 and s.submitted_at is not null group by 1
    ),
    q as (
      select (submitted_at at time zone ${TZ})::date as d, count(*)::int as n from quiz_attempts
      where student_id = ${studentId} and status <> 'in_progress' group by 1
    ),
    g as (
      select (graded_at at time zone ${TZ})::date as d, avg(percent) as a from grades where student_id = ${studentId} group by 1
    )
    select to_char(days.d, 'YYYY-MM-DD') as day, coalesce(t.n,0) as tasks, coalesce(q.n,0) as quizzes, g.a as avg
    from days left join t on t.d = days.d left join q on q.d = days.d left join g on g.d = days.d
    order by days.d`);
  return new Map(rows.map((r) => [r.day, { day: r.day, tasks: r.tasks, quizzes: r.quizzes, avg: r.avg == null ? null : round2(Number(r.avg)) }]));
}

async function quizAccuracy(studentId: string, from?: Date, to?: Date) {
  const r = await db.execute<{ correct: number; total: number }>(sql`
    select count(*) filter (where qr.is_correct)::int as correct, count(*) filter (where qr.is_correct is not null)::int as total
    from quiz_responses qr join quiz_attempts qa on qa.id = qr.attempt_id
    where qa.student_id = ${studentId} and qa.status <> 'in_progress'
      ${from ? sql`and qa.submitted_at >= ${tsz(from)}` : sql``} ${to ? sql`and qa.submitted_at < ${tsz(to)}` : sql``}`);
  const { correct, total } = r[0] ?? { correct: 0, total: 0 };
  return total ? round2((correct / total) * 100) : null;
}

async function averageGrade(studentId: string, from?: Date, to?: Date) {
  const r = await db.execute<{ avg: string | null; n: number }>(sql`
    select avg(percent) as avg, count(*)::int as n from grades where student_id = ${studentId}
    ${from ? sql`and graded_at >= ${tsz(from)}` : sql``} ${to ? sql`and graded_at < ${tsz(to)}` : sql``}`);
  return { avg: r[0]?.avg == null ? null : round2(Number(r[0].avg)), count: r[0]?.n ?? 0 };
}

/** Moment at local midnight (Asia/Tashkent, UTC+5) of a YYYY-MM-DD day. */
const startOf = (day: string) => new Date(day + "T00:00:00+05:00");

export async function studentDashboard(studentId: string, weeklyTaskGoal: number) {
  const today = localDay(new Date());
  const ws = weekStart(today);
  const [assignments, game, acc, avg, days, weekCompletions] = await Promise.all([
    listForStudent(studentId),
    gamificationSummary(studentId),
    quizAccuracy(studentId),
    averageGrade(studentId),
    dailyActivity(studentId, addDays(today, -6), today),
    db.execute<{ n: number }>(sql`
      select (
        (select count(*) from submissions where student_id = ${studentId} and version > 0 and submitted_at >= ${tsz(startOf(ws))})
        + (select count(distinct assignment_id) from quiz_attempts where student_id = ${studentId} and status <> 'in_progress' and submitted_at >= ${tsz(startOf(ws))})
      )::int as n`),
  ]);
  const completed = assignments.filter((a) => isDone(a.status)).length;
  const pending = assignments.filter((a) => !isDone(a.status)).length;
  const weekDone = weekCompletions[0]?.n ?? 0;
  const now = new Date();
  const endOfToday = new Date(startOf(today).getTime() + 86400_000);
  const todays = assignments.filter((a) => !isDone(a.status) && a.dueAt && a.dueAt >= now && a.dueAt < endOfToday);
  const recentNew = assignments.filter((a) => !isDone(a.status) && (!a.dueAt || a.dueAt >= now) && !todays.includes(a)).slice(0, 4);
  const upcoming = assignments
    .filter((a) => !isDone(a.status) && a.dueAt && a.dueAt >= now)
    .sort((x, y) => x.dueAt!.getTime() - y.dueAt!.getTime())
    .slice(0, 6);
  await deadlineReminders(studentId, assignments);
  await weeklySummary(studentId, today);
  return {
    today,
    stats: {
      completed,
      pending,
      averageGrade: avg.avg,
      gradedCount: avg.count,
      quizAccuracy: acc,
      weeklyProgress: Math.min(100, Math.round((weekDone / Math.max(1, weeklyTaskGoal)) * 100)),
      weekDone,
      weeklyTaskGoal,
      streak: game.streak.current,
      bestStreak: game.streak.best,
    },
    game,
    todays,
    focus: todays.length ? todays : recentNew,
    upcoming,
    overdue: assignments.filter((a) => a.status === "overdue"),
    all: assignments,
    week: lastNDays(today, 7).map((d) => days.get(d) ?? { day: d, tasks: 0, quizzes: 0, avg: null }),
    hasAnyActivity: [...days.values()].some((d) => d.tasks + d.quizzes > 0) || completed > 0,
  };
}

/** One notification per assignment when its deadline is within 24h and nothing has been handed in. */
async function deadlineReminders(studentId: string, rows: StudentAssignmentRow[]) {
  const settings = await getSettings();
  const now = Date.now();
  for (const a of rows) {
    if (!a.dueAt || isDone(a.status) || a.status === "in_progress") continue;
    const h = (a.dueAt.getTime() - now) / 3600_000;
    if (h > 0 && h <= 24)
      await notify([studentId], {
        type: "deadline",
        title: fillTemplate(settings.notificationTemplates.deadline, { title: a.title }),
        body: `${Math.max(1, Math.round(h))} soat qoldi`,
        link: a.questionCount ? `/quizzes/${a.id}` : `/assignments/${a.id}`,
        dedupeKey: `deadline:${a.id}`,
      });
  }
}

/** On the first visit of a new week, leave a summary of the previous week. */
async function weeklySummary(studentId: string, today: string) {
  const ws = weekStart(today);
  const prev = addDays(ws, -7);
  const r = await db.execute<{ tasks: number; quizzes: number; avg: string | null }>(sql`
    select
      (select count(*)::int from submissions where student_id = ${studentId} and version > 0 and submitted_at >= ${tsz(startOf(prev))} and submitted_at < ${tsz(startOf(ws))}) as tasks,
      (select count(*)::int from quiz_attempts where student_id = ${studentId} and status <> 'in_progress' and submitted_at >= ${tsz(startOf(prev))} and submitted_at < ${tsz(startOf(ws))}) as quizzes,
      (select avg(percent) from grades where student_id = ${studentId} and graded_at >= ${tsz(startOf(prev))} and graded_at < ${tsz(startOf(ws))}) as avg`);
  const s = r[0];
  if (!s || s.tasks + s.quizzes === 0) return;
  const settings = await getSettings();
  await notify([studentId], {
    type: "weekly_summary",
    title: fillTemplate(settings.notificationTemplates.weekly, {}),
    body: `O‘tgan hafta: ${s.tasks} ta vazifa, ${s.quizzes} ta quiz${s.avg ? `, o‘rtacha ${Math.round(Number(s.avg))}%` : ""}.`,
    link: "/results",
    dedupeKey: `weekly:${ws}`,
  });
}

export type ResultsRange = { from: string; to: string };

export async function studentResults(studentId: string, range: ResultsRange) {
  const fromD = startOf(range.from);
  const toD = new Date(startOf(range.to).getTime() + 86400_000);
  const today = localDay(new Date());
  const ws = weekStart(today);
  const prevWs = addDays(ws, -7);

  const [bySubject, assigned, punctuality, overTime, acc, avg, thisWeek, lastWeek, days] = await Promise.all([
    db.execute<{ subject: string; color: string; avg: string; n: number }>(sql`
      select s.name as subject, s.color, avg(g.percent) as avg, count(*)::int as n
      from grades g join assignments a on a.id = g.assignment_id join subjects s on s.id = a.subject_id
      where g.student_id = ${studentId} and g.graded_at >= ${tsz(fromD)} and g.graded_at < ${tsz(toD)}
      group by s.name, s.color order by avg desc`),
    listForStudent(studentId),
    db.execute<{ on_time: number; late: number }>(sql`
      select count(*) filter (where not is_late)::int as on_time, count(*) filter (where is_late)::int as late from (
        select v.is_late from submission_versions v join submissions s on s.id = v.submission_id join assignments a on a.id = s.assignment_id
        where s.student_id = ${studentId} and v.version = 1 and a.type <> 'material' and v.submitted_at >= ${tsz(fromD)} and v.submitted_at < ${tsz(toD)}
        union all
        select is_late from quiz_attempts where student_id = ${studentId} and attempt_no = 1 and status <> 'in_progress' and submitted_at >= ${tsz(fromD)} and submitted_at < ${tsz(toD)}
      ) x`),
    db.execute<{ week: string; avg: string; n: number }>(sql`
      select to_char(date_trunc('week', (graded_at at time zone ${TZ}))::date, 'YYYY-MM-DD') as week, avg(percent) as avg, count(*)::int as n
      from grades where student_id = ${studentId} and graded_at >= ${tsz(fromD)} and graded_at < ${tsz(toD)}
      group by 1 order by 1`),
    quizAccuracy(studentId, fromD, toD),
    averageGrade(studentId, fromD, toD),
    weekStats(studentId, ws, addDays(ws, 7)),
    weekStats(studentId, prevWs, ws),
    dailyActivity(studentId, range.from, range.to),
  ]);
  const inRange = assigned.filter((a) => (a.dueAt ? a.dueAt >= fromD && a.dueAt < toD : a.publishedAt ? a.publishedAt >= fromD && a.publishedAt < toD : false));
  const subjects = bySubject.map((s) => ({ subject: s.subject, color: s.color, average: round2(Number(s.avg)), count: s.n }));
  const p = punctuality[0] ?? { on_time: 0, late: 0 };
  return {
    range,
    averageGrade: avg.avg,
    gradedCount: avg.count,
    quizAccuracy: acc,
    completedVsAssigned: { completed: inRange.filter((a) => isDone(a.status)).length, assigned: inRange.length },
    punctuality: { onTime: p.on_time, late: p.late, rate: p.on_time + p.late ? round2((p.on_time / (p.on_time + p.late)) * 100) : null },
    subjects,
    strong: subjects.filter((s) => s.average >= 80),
    needsPractice: subjects.filter((s) => s.average < 60),
    overTime: overTime.map((o) => ({ week: o.week, average: round2(Number(o.avg)), count: o.n })),
    daily: [...days.values()],
    compare: { thisWeek, lastWeek },
  };
}

async function weekStats(studentId: string, from: string, to: string) {
  const r = await db.execute<{ tasks: number; quizzes: number; avg: string | null; correct: number; total: number }>(sql`
    select
      (select count(*)::int from submissions where student_id = ${studentId} and version > 0 and submitted_at >= ${tsz(startOf(from))} and submitted_at < ${tsz(startOf(to))}) as tasks,
      (select count(*)::int from quiz_attempts where student_id = ${studentId} and status <> 'in_progress' and submitted_at >= ${tsz(startOf(from))} and submitted_at < ${tsz(startOf(to))}) as quizzes,
      (select avg(percent) from grades where student_id = ${studentId} and graded_at >= ${tsz(startOf(from))} and graded_at < ${tsz(startOf(to))}) as avg,
      (select count(*) filter (where qr.is_correct)::int from quiz_responses qr join quiz_attempts qa on qa.id = qr.attempt_id where qa.student_id = ${studentId} and qa.submitted_at >= ${tsz(startOf(from))} and qa.submitted_at < ${tsz(startOf(to))}) as correct,
      (select count(*) filter (where qr.is_correct is not null)::int from quiz_responses qr join quiz_attempts qa on qa.id = qr.attempt_id where qa.student_id = ${studentId} and qa.submitted_at >= ${tsz(startOf(from))} and qa.submitted_at < ${tsz(startOf(to))}) as total`);
  const s = r[0];
  return { tasks: s.tasks, quizzes: s.quizzes, average: s.avg == null ? null : round2(Number(s.avg)), accuracy: s.total ? round2((s.correct / s.total) * 100) : null };
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export async function teacherOverview(actor: Actor) {
  const scope = await manageableAssignmentsWhere(actor, undefined, "a");
  const classIds = await manageableClassIds(actor);
  const classFilter = classIds === "all" ? sql`c.archived_at is null` : classIds.length ? sql`c.id in ${classIds}` : sql`false`;
  const [classes, counts, upcoming, recent] = await Promise.all([
    db.execute<{ id: string; name: string; students: number; academic_year: string }>(sql`
      select c.id, c.name, c.academic_year, (select count(*)::int from class_students cs join users u on u.id = cs.student_id and u.status = 'active' where cs.class_id = c.id) as students
      from classes c where ${classFilter} and c.archived_at is null order by c.name`),
    db.execute<{ pending: number; published: number; drafts: number }>(sql`
      select
        ((select count(*) from submissions s join assignments a on a.id = s.assignment_id where s.status = 'submitted' and a.type not in ('material','practice') and ${scope}
           and not exists (select 1 from grades g where g.assignment_id = s.assignment_id and g.student_id = s.student_id and g.status = 'final'))
         + (select count(*) from quiz_attempts qa join assignments a on a.id = qa.assignment_id where qa.status = 'submitted' and qa.needs_manual_grading and ${scope}))::int as pending,
        (select count(*)::int from assignments a where a.status = 'published' and ${scope}) as published,
        (select count(*)::int from assignments a where a.status in ('draft','scheduled') and ${scope}) as drafts`),
    db.execute<{ id: string; title: string; due_at: string; type: string }>(sql`
      select a.id, a.title, a.due_at, a.type from assignments a where a.status = 'published' and a.due_at > now() and ${scope} order by a.due_at limit 6`),
    db.execute<{ assignment_id: string; student_id: string; title: string; student_name: string; submitted_at: string; is_late: boolean }>(sql`
      select s.assignment_id, s.student_id, a.title, u.display_name as student_name, s.submitted_at, s.is_late
      from submissions s join assignments a on a.id = s.assignment_id join users u on u.id = s.student_id
      where s.version > 0 and a.type <> 'material' and ${scope} order by s.submitted_at desc limit 8`),
  ]);
  const completion = await db.execute<{ id: string; title: string; done: number; total: number }>(sql`
    with live as (select a.id, a.title, a.type from assignments a where a.status = 'published' and ${scope} order by a.published_at desc nulls last limit 6),
    tgt as (
      select l.id, u.id as student_id from live l
      join users u on u.role = 'student' and u.status = 'active'
      where exists (select 1 from assignment_targets t left join class_students cs on cs.class_id = t.class_id and cs.student_id = u.id where t.assignment_id = l.id and (t.student_id = u.id or cs.student_id is not null))
    )
    select l.id, l.title,
      (select count(*)::int from tgt where tgt.id = l.id and (exists (select 1 from submissions s where s.assignment_id = l.id and s.student_id = tgt.student_id and s.version > 0) or exists (select 1 from quiz_attempts qa where qa.assignment_id = l.id and qa.student_id = tgt.student_id and qa.status <> 'in_progress'))) as done,
      (select count(*)::int from tgt where tgt.id = l.id) as total
    from live l`);
  return { classes, counts: counts[0], upcoming, recent, completion };
}

export async function adminOverview() {
  const [counts, recent, completion, perDay] = await Promise.all([
    db.execute<{ students: number; teachers: number; classes: number; published: number; pending: number; inactive: number }>(sql`
      select
        (select count(*)::int from users where role = 'student' and status = 'active') as students,
        (select count(*)::int from users where role = 'teacher' and status = 'active') as teachers,
        (select count(*)::int from classes where archived_at is null) as classes,
        (select count(*)::int from assignments where status = 'published') as published,
        ((select count(*) from submissions s join assignments a on a.id = s.assignment_id where s.status = 'submitted' and a.type not in ('material','practice')
           and not exists (select 1 from grades g where g.assignment_id = s.assignment_id and g.student_id = s.student_id and g.status = 'final'))
         + (select count(*) from quiz_attempts where status = 'submitted' and needs_manual_grading))::int as pending,
        (select count(*)::int from users where status = 'deactivated') as inactive`),
    db.execute<{ id: string; action: string; entity_type: string; created_at: string; actor: string | null; meta: Record<string, unknown> }>(sql`
      select l.id, l.action, l.entity_type, l.created_at, u.display_name as actor, l.meta from audit_logs l left join users u on u.id = l.actor_id
      order by l.created_at desc limit 10`),
    db.execute<{ done: number; total: number }>(sql`
      with pairs as (
        select distinct a.id as aid, u.id as sid from assignments a
        join assignment_targets t on t.assignment_id = a.id
        join users u on u.role = 'student' and u.status = 'active' and (t.student_id = u.id or u.id in (select student_id from class_students where class_id = t.class_id))
        where a.status = 'published' and a.type <> 'material'
      )
      select
        count(*) filter (where exists (select 1 from submissions s where s.assignment_id = pairs.aid and s.student_id = pairs.sid and s.version > 0)
          or exists (select 1 from quiz_attempts qa where qa.assignment_id = pairs.aid and qa.student_id = pairs.sid and qa.status <> 'in_progress'))::int as done,
        count(*)::int as total
      from pairs`),
    db.execute<{ day: string; n: number }>(sql`
      with days as (select generate_series((now() at time zone ${TZ})::date - 13, (now() at time zone ${TZ})::date, interval '1 day')::date as d)
      select to_char(days.d, 'YYYY-MM-DD') as day,
        ((select count(*) from submission_versions v where (v.submitted_at at time zone ${TZ})::date = days.d)
         + (select count(*) from quiz_attempts qa where qa.status <> 'in_progress' and (qa.submitted_at at time zone ${TZ})::date = days.d))::int as n
      from days order by days.d`),
  ]);
  const c = completion[0] ?? { done: 0, total: 0 };
  return { counts: counts[0], recent, completion: { ...c, rate: c.total ? round2((c.done / c.total) * 100) : null }, perDay };
}
