import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db";
import type { Actor } from "../auth/rbac";
import { isDone } from "@/lib/assignment-kinds";
import { addDays } from "@/lib/gamification";
import { lastNDays, localDay, weekStart } from "@/lib/dates";
import { round2 } from "@/lib/grading";
import { AREAS, areaOf } from "@/lib/course";
import { listForStudent, type StudentAssignmentRow } from "./assignments";
import { gamificationSummary } from "./gamification";
import { manageableAssignmentsWhere, manageableClassIds } from "./access";
import { notify } from "./notifications";
import { fillTemplate, getSettings } from "./settings";

const TZ = sql.raw(`'Asia/Tashkent'`);
/** postgres.js can't bind Date objects inside raw sql templates — pass ISO strings. */
const tsz = (d: Date) => sql`${d.toISOString()}::timestamptz`;

type DayRow = { day: string; tasks: number; quizzes: number; words: number; avg: number | null };

/** Per-day activity for a student between two local dates (inclusive). Only real records. */
async function dailyActivity(studentId: string, from: string, to: string): Promise<Map<string, DayRow>> {
  const rows = await db.execute<{ day: string; tasks: number; quizzes: number; words: number; avg: string | null }>(sql`
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
    ),
    w as (
      select (reviewed_at at time zone ${TZ})::date as d, count(*)::int as n from vocab_reviews where student_id = ${studentId} group by 1
    )
    select to_char(days.d, 'YYYY-MM-DD') as day, coalesce(t.n,0) as tasks, coalesce(q.n,0) as quizzes, coalesce(w.n,0) as words, g.a as avg
    from days left join t on t.d = days.d left join q on q.d = days.d left join g on g.d = days.d left join w on w.d = days.d
    order by days.d`);
  return new Map(rows.map((r) => [r.day, { day: r.day, tasks: r.tasks, quizzes: r.quizzes, words: r.words, avg: r.avg == null ? null : round2(Number(r.avg)) }]));
}

/** Activities toward the daily goal: a submitted task, a finished quiz, or each block of 10 word reviews. */
export const goalUnits = (d: Pick<DayRow, "tasks" | "quizzes" | "words">) => d.tasks + d.quizzes + Math.floor(d.words / 10);

/** Average score of finished, fully scored quiz attempts (official and practice). */
async function quizAverage(studentId: string, from?: Date, to?: Date) {
  const r = await db.execute<{ avg: string | null; n: number }>(sql`
    select avg(100 * score / nullif(max_score, 0)) as avg, count(*)::int as n from quiz_attempts
    where student_id = ${studentId} and status = 'graded' and score is not null
      ${from ? sql`and submitted_at >= ${tsz(from)}` : sql``} ${to ? sql`and submitted_at < ${tsz(to)}` : sql``}`);
  return { avg: r[0]?.avg == null ? null : round2(Number(r[0].avg)), count: r[0]?.n ?? 0 };
}

async function vocabStats(studentId: string) {
  const r = await db.execute<{ learned: number; mastered: number; due: number; reviews7: number }>(sql`
    select
      (select count(*)::int from vocab_progress where student_id = ${studentId} and reps > 0) as learned,
      (select count(*)::int from vocab_progress where student_id = ${studentId} and state = 'mastered') as mastered,
      (select count(*)::int from vocab_progress p join words w on w.id = p.word_id and w.archived_at is null where p.student_id = ${studentId} and p.due_at <= now()) as due,
      (select count(*)::int from vocab_reviews where student_id = ${studentId} and reviewed_at > now() - interval '7 days') as reviews7`);
  return r[0] ?? { learned: 0, mastered: 0, due: 0, reviews7: 0 };
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

export async function studentDashboard(studentId: string, weeklyTaskGoal: number, dailyGoal = 3) {
  const today = localDay(new Date());
  const ws = weekStart(today);
  const [assignments, game, acc, avg, qavg, vocab, days, weekCompletions] = await Promise.all([
    listForStudent(studentId),
    gamificationSummary(studentId),
    quizAccuracy(studentId),
    averageGrade(studentId),
    quizAverage(studentId),
    vocabStats(studentId),
    dailyActivity(studentId, addDays(today, -6), today),
    db.execute<{ n: number }>(sql`
      select (
        (select count(*) from submissions where student_id = ${studentId} and version > 0 and submitted_at >= ${tsz(startOf(ws))})
        + (select count(distinct assignment_id) from quiz_attempts where student_id = ${studentId} and status <> 'in_progress' and submitted_at >= ${tsz(startOf(ws))})
      )::int as n`),
  ]);
  const completed = assignments.filter((a) => isDone(a.status)).length;
  const pending = assignments.filter((a) => !isDone(a.status)).length;
  const counted = assignments.filter((a) => a.type !== "material" && a.type !== "practice");
  const homeworkRate = counted.length ? Math.round((100 * counted.filter((a) => isDone(a.status)).length) / counted.length) : null;
  const todayRow = days.get(today);
  const todayUnits = todayRow ? goalUnits(todayRow) : 0;
  const unfinished = assignments.filter((a) => a.status === "in_progress" || a.status === "returned");
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
      quizAverage: qavg.avg,
      quizCount: qavg.count,
      homeworkRate,
      vocabLearned: vocab.learned,
      vocabMastered: vocab.mastered,
      vocabDue: vocab.due,
      dailyGoal,
      todayUnits,
      weeklyProgress: Math.min(100, Math.round((weekDone / Math.max(1, weeklyTaskGoal)) * 100)),
      weekDone,
      weeklyTaskGoal,
      streak: game.streak.current,
      bestStreak: game.streak.best,
    },
    game,
    todays,
    focus: [...todays, ...recentNew],
    unfinished,
    upcoming,
    overdue: assignments.filter((a) => a.status === "overdue"),
    all: assignments,
    week: lastNDays(today, 7).map((d) => days.get(d) ?? { day: d, tasks: 0, quizzes: 0, words: 0, avg: null }),
    hasAnyActivity: [...days.values()].some((d) => d.tasks + d.quizzes + d.words > 0) || completed > 0,
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

  const [byCode, practiceByCode, vocabRange, recentGrades, qavg, assigned, punctuality, overTime, acc, avg, thisWeek, lastWeek, days] = await Promise.all([
    db.execute<{ code: string; avg: string; n: number }>(sql`
      select s.code, avg(g.percent) as avg, count(*)::int as n
      from grades g join assignments a on a.id = g.assignment_id join subjects s on s.id = a.subject_id
      where g.student_id = ${studentId} and g.graded_at >= ${tsz(fromD)} and g.graded_at < ${tsz(toD)}
      group by s.code`),
    db.execute<{ code: string; avg: string; n: number }>(sql`
      select s.code, avg(100 * qa.score / nullif(qa.max_score, 0)) as avg, count(*)::int as n
      from quiz_attempts qa join assignments a on a.id = qa.assignment_id join subjects s on s.id = a.subject_id
      where qa.student_id = ${studentId} and a.type = 'practice' and qa.status = 'graded' and qa.submitted_at >= ${tsz(fromD)} and qa.submitted_at < ${tsz(toD)}
      group by s.code`),
    db.execute<{ reviews: number; correct: number; learned: number; mastered: number; due: number }>(sql`
      select
        (select count(*)::int from vocab_reviews where student_id = ${studentId} and reviewed_at >= ${tsz(fromD)} and reviewed_at < ${tsz(toD)}) as reviews,
        (select count(*)::int from vocab_reviews where student_id = ${studentId} and correct and reviewed_at >= ${tsz(fromD)} and reviewed_at < ${tsz(toD)}) as correct,
        (select count(*)::int from vocab_progress where student_id = ${studentId} and reps > 0) as learned,
        (select count(*)::int from vocab_progress where student_id = ${studentId} and state = 'mastered') as mastered,
        (select count(*)::int from vocab_progress p join words w on w.id = p.word_id and w.archived_at is null where p.student_id = ${studentId} and p.due_at <= now()) as due`),
    db.execute<{ id: string; title: string; type: string; percent: string; scale_label: string | null; status: string; graded_at: string }>(sql`
      select a.id, a.title, a.type, g.percent, g.scale_label, g.status, g.graded_at from grades g join assignments a on a.id = g.assignment_id
      where g.student_id = ${studentId} order by g.graded_at desc nulls last limit 6`),
    quizAverage(studentId, fromD, toD),
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
  const areas = AREAS.map((a) => {
    const off = byCode.filter((r) => areaOf(r.code) === a.key);
    const pr = practiceByCode.filter((r) => areaOf(r.code) === a.key);
    const wavg = (rows: { avg: string; n: number }[]) => {
      const n = rows.reduce((x, r) => x + r.n, 0);
      return n ? round2(rows.reduce((x, r) => x + Number(r.avg) * r.n, 0) / n) : null;
    };
    return { key: a.key, label: a.label, official: wavg(off), officialCount: off.reduce((x, r) => x + r.n, 0), practice: wavg(pr), practiceCount: pr.reduce((x, r) => x + r.n, 0) };
  }).filter((a) => a.officialCount + a.practiceCount > 0);
  const combined = (a: (typeof areas)[number]) => a.official ?? a.practice ?? 0;
  const v = vocabRange[0] ?? { reviews: 0, correct: 0, learned: 0, mastered: 0, due: 0 };
  const p = punctuality[0] ?? { on_time: 0, late: 0 };
  return {
    range,
    averageGrade: avg.avg,
    gradedCount: avg.count,
    quizAccuracy: acc,
    quizAverage: qavg.avg,
    quizCount: qavg.count,
    missed: inRange.filter((a) => a.status === "overdue"),
    recentGrades: recentGrades.map((g) => ({ id: g.id, title: g.title, type: g.type, percent: round2(Number(g.percent)), label: g.scale_label, status: g.status, gradedAt: g.graded_at ? new Date(g.graded_at) : null })),
    vocab: { ...v, accuracy: v.reviews ? round2((100 * v.correct) / v.reviews) : null },
    completedVsAssigned: { completed: inRange.filter((a) => isDone(a.status)).length, assigned: inRange.length },
    punctuality: { onTime: p.on_time, late: p.late, rate: p.on_time + p.late ? round2((p.on_time / (p.on_time + p.late)) * 100) : null },
    areas,
    strong: areas.filter((a) => combined(a) >= 80),
    needsPractice: areas.filter((a) => combined(a) < 60),
    overTime: overTime.map((o) => ({ week: o.week, average: round2(Number(o.avg)), count: o.n })),
    daily: [...days.values()],
    compare: { thisWeek, lastWeek },
  };
}

async function weekStats(studentId: string, from: string, to: string) {
  const r = await db.execute<{ tasks: number; quizzes: number; words: number; avg: string | null; correct: number; total: number }>(sql`
    select
      (select count(*)::int from vocab_reviews where student_id = ${studentId} and reviewed_at >= ${tsz(startOf(from))} and reviewed_at < ${tsz(startOf(to))}) as words,
      (select count(*)::int from submissions where student_id = ${studentId} and version > 0 and submitted_at >= ${tsz(startOf(from))} and submitted_at < ${tsz(startOf(to))}) as tasks,
      (select count(*)::int from quiz_attempts where student_id = ${studentId} and status <> 'in_progress' and submitted_at >= ${tsz(startOf(from))} and submitted_at < ${tsz(startOf(to))}) as quizzes,
      (select avg(percent) from grades where student_id = ${studentId} and graded_at >= ${tsz(startOf(from))} and graded_at < ${tsz(startOf(to))}) as avg,
      (select count(*) filter (where qr.is_correct)::int from quiz_responses qr join quiz_attempts qa on qa.id = qr.attempt_id where qa.student_id = ${studentId} and qa.submitted_at >= ${tsz(startOf(from))} and qa.submitted_at < ${tsz(startOf(to))}) as correct,
      (select count(*) filter (where qr.is_correct is not null)::int from quiz_responses qr join quiz_attempts qa on qa.id = qr.attempt_id where qa.student_id = ${studentId} and qa.submitted_at >= ${tsz(startOf(from))} and qa.submitted_at < ${tsz(startOf(to))}) as total`);
  const s = r[0];
  return { tasks: s.tasks, quizzes: s.quizzes, words: s.words, average: s.avg == null ? null : round2(Number(s.avg)), accuracy: s.total ? round2((s.correct / s.total) * 100) : null };
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

/**
 * Students who may need a follow-up, from real records only: no learning activity for 7+ days,
 * 2+ missed deadlines, or a low recent average. Scoped to the actor's groups.
 */
export async function followUps(actor: Actor, limit = 8) {
  const classIds = await manageableClassIds(actor);
  if (classIds !== "all" && !classIds.length) return [];
  const rows = await db.execute<{ id: string; name: string; last: string | null; overdue: number; avg: string | null }>(sql`
    with s as (
      select distinct u.id, u.display_name, u.created_at from users u
      ${classIds === "all" ? sql`` : sql`join class_students cs on cs.student_id = u.id and cs.class_id in ${classIds}`}
      where u.role = 'student' and u.status = 'active'
    )
    select s.id, s.display_name as name,
      greatest(
        (select max(v.submitted_at) from submission_versions v join submissions sb on sb.id = v.submission_id where sb.student_id = s.id),
        (select max(submitted_at) from quiz_attempts where student_id = s.id),
        (select max(reviewed_at) from vocab_reviews where student_id = s.id)
      ) as last,
      (select count(*)::int from assignments a
        where a.status = 'published' and a.due_at < now() and a.type not in ('material', 'practice')
          and exists (select 1 from assignment_targets t where t.assignment_id = a.id and (t.student_id = s.id or t.class_id in (select class_id from class_students where student_id = s.id)))
          and not exists (select 1 from submissions sb where sb.assignment_id = a.id and sb.student_id = s.id and sb.version > 0)
          and not exists (select 1 from quiz_attempts qa where qa.assignment_id = a.id and qa.student_id = s.id and qa.status <> 'in_progress')) as overdue,
      (select avg(percent) from grades where student_id = s.id and graded_at > now() - interval '30 days') as avg
    from s where s.created_at < now() - interval '3 days'`);
  const now = Date.now();
  return rows
    .map((r) => {
      const last = r.last ? new Date(r.last) : null;
      const idleDays = last ? Math.floor((now - last.getTime()) / 86400_000) : null;
      const avg = r.avg == null ? null : round2(Number(r.avg));
      const reasons: string[] = [];
      if (idleDays == null) reasons.push("hali faollik yo‘q");
      else if (idleDays >= 7) reasons.push(`${idleDays} kundan beri faol emas`);
      if (r.overdue >= 2) reasons.push(`${r.overdue} ta muddati o‘tgan`);
      if (avg != null && avg < 50) reasons.push(`o‘rtacha ${Math.round(avg)}%`);
      return { id: r.id, name: r.name, reasons, weight: (idleDays ?? 30) + r.overdue * 5 + (avg != null && avg < 50 ? 10 : 0) };
    })
    .filter((r) => r.reasons.length)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

/** Recently finished quiz attempts within the actor's scope. */
export async function recentQuizzes(actor: Actor, limit = 6) {
  const scope = await manageableAssignmentsWhere(actor, undefined, "a");
  const rows = await db.execute<{ id: string; assignment_id: string; student_id: string; title: string; name: string; score: string | null; max_score: string; status: string; submitted_at: string }>(sql`
    select qa.id, qa.assignment_id, qa.student_id, a.title, u.display_name as name, qa.score, qa.max_score, qa.status, qa.submitted_at
    from quiz_attempts qa join assignments a on a.id = qa.assignment_id join users u on u.id = qa.student_id
    where qa.status <> 'in_progress' and ${scope} order by qa.submitted_at desc limit ${limit}`);
  return rows.map((r) => ({ ...r, percent: r.score == null ? null : Math.round((100 * Number(r.score)) / Number(r.max_score)), submittedAt: new Date(r.submitted_at) }));
}
