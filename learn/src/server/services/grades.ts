import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { can, isAdmin, type Actor } from "../auth/rbac";
import { AppError, forbidden, invalid, notFound } from "../errors";
import { bandFor, latePenalty, percentOf, round2 } from "@/lib/grading";
import { isGradedType, isQuizType } from "@/lib/assignment-kinds";
import { assertCanGrade, manageableAssignmentsWhere, manageableClassIds } from "./access";
import { audit } from "./audit";
import { booksByIds } from "./library";
import { notify } from "./notifications";
import { fillTemplate, getSettings } from "./settings";
import { evaluateAchievements } from "./gamification";

const gradeInput = z.object({
  points: z.coerce.number().min(0).optional(),
  rubricScores: z.record(z.string(), z.coerce.number().min(0)).default({}),
  feedback: z.string().trim().max(5000).default(""),
  finalize: z.boolean().default(false),
  reason: z.string().trim().max(500).default(""),
  applyLatePenalty: z.boolean().default(true),
});

/** Everything a grader needs on one screen. */
export async function gradingContext(actor: Actor, assignmentId: string, studentId: string) {
  const asg = await assertCanGrade(actor, assignmentId, studentId);
  const [student, submission, grade, fb, subject] = await Promise.all([
    db.select({ id: schema.users.id, displayName: schema.users.displayName, username: schema.users.username, studentCode: schema.users.studentCode }).from(schema.users).where(eq(schema.users.id, studentId)),
    db.select().from(schema.submissions).where(and(eq(schema.submissions.assignmentId, assignmentId), eq(schema.submissions.studentId, studentId))),
    db.select().from(schema.grades).where(and(eq(schema.grades.assignmentId, assignmentId), eq(schema.grades.studentId, studentId))),
    db
      .select({ id: schema.feedback.id, body: schema.feedback.body, kind: schema.feedback.kind, createdAt: schema.feedback.createdAt, author: schema.users.displayName })
      .from(schema.feedback)
      .innerJoin(schema.users, eq(schema.users.id, schema.feedback.authorId))
      .where(and(eq(schema.feedback.assignmentId, assignmentId), eq(schema.feedback.studentId, studentId)))
      .orderBy(desc(schema.feedback.createdAt)),
    db.select().from(schema.subjects).where(eq(schema.subjects.id, asg.subjectId)),
  ]);
  const sub = submission[0] ?? null;
  const [files, versions] = sub
    ? await Promise.all([
        db
          .select({ id: schema.files.id, name: schema.files.name, mime: schema.files.mime, size: schema.files.size })
          .from(schema.submissionFiles)
          .innerJoin(schema.files, eq(schema.files.id, schema.submissionFiles.fileId))
          .where(eq(schema.submissionFiles.submissionId, sub.id)),
        db.select().from(schema.submissionVersions).where(eq(schema.submissionVersions.submissionId, sub.id)).orderBy(desc(schema.submissionVersions.version)),
      ])
    : [[], []];
  const g = grade[0] ?? null;
  const history = g
    ? await db
        .select({ id: schema.gradeHistory.id, oldPoints: schema.gradeHistory.oldPoints, newPoints: schema.gradeHistory.newPoints, oldStatus: schema.gradeHistory.oldStatus, newStatus: schema.gradeHistory.newStatus, reason: schema.gradeHistory.reason, changedAt: schema.gradeHistory.changedAt, by: schema.users.displayName })
        .from(schema.gradeHistory)
        .innerJoin(schema.users, eq(schema.users.id, schema.gradeHistory.changedBy))
        .where(eq(schema.gradeHistory.gradeId, g.id))
        .orderBy(desc(schema.gradeHistory.changedAt))
    : [];
  const books = await booksByIds([...new Set(asg.items.map((i) => i.bookId).filter((x): x is string => !!x))]);
  return { assignment: asg, subject: subject[0], student: student[0], submission: sub, files, versions, grade: g, feedback: fb, history, books, canEditFinal: can(actor, "grades.edit_final") };
}

/** Grades written / file-upload work (quizzes are graded through the quiz engine). */
export async function gradeSubmission(actor: Actor, assignmentId: string, studentId: string, input: unknown) {
  const asg = await assertCanGrade(actor, assignmentId, studentId);
  if (isQuizType(asg.type)) throw invalid("Quizlar savollar bo‘yicha baholanadi.");
  if (!isGradedType(asg.type)) throw invalid("Bu vazifa baholanmaydi.");
  const v = gradeInput.parse(input);
  const max = Number(asg.maxScore);
  let raw: number;
  if (asg.rubric.length) {
    for (const c of asg.rubric) {
      const s = v.rubricScores[c.id];
      if (s == null) throw invalid(`“${c.title}” mezoni uchun ball kiriting.`);
      if (s > c.maxPoints) throw invalid(`“${c.title}” uchun ko‘pi bilan ${c.maxPoints} ball.`);
    }
    raw = round2(asg.rubric.reduce((s, c) => s + (v.rubricScores[c.id] ?? 0), 0));
  } else {
    if (v.points == null) throw invalid("Ballni kiriting.");
    raw = round2(v.points);
  }
  if (raw > max) throw invalid(`Ball ${max} dan oshmasligi kerak.`);
  const settings = await getSettings();

  const res = await db.transaction(async (tx) => {
    const sub = (await tx.execute<{ id: string; is_late: boolean; status: string }>(sql`
      select id, is_late, status from submissions where assignment_id = ${assignmentId} and student_id = ${studentId} for update`))[0];
    if (!sub || sub.status === "draft") throw new AppError("conflict", "O‘quvchi hali ishni topshirmagan.");
    const existing = (await tx.execute<{ id: string; points: string; status: "provisional" | "final" }>(sql`
      select id, points, status from grades where assignment_id = ${assignmentId} and student_id = ${studentId} for update`))[0];
    if (existing?.status === "final") {
      if (!can(actor, "grades.edit_final")) throw forbidden("Yakuniy bahoni o‘zgartirish uchun ruxsat yo‘q.");
      if (v.reason.length < 5) throw invalid("Yakuniy bahoni o‘zgartirish sababini yozing (kamida 5 belgi).");
      // Opens the database guard for this transaction only; the reason is also written to grade_history.
      await tx.execute(sql`select set_config('app.grade_change_reason', ${v.reason}, true)`);
    }
    const pen = v.applyLatePenalty ? latePenalty(raw, max, asg.latePenaltyPercent, sub.is_late) : 0;
    const points = round2(raw - pen);
    const percent = percentOf(points, max);
    const label = bandFor(percent, settings.grading.scale).label;
    const status: "provisional" | "final" = v.finalize || existing?.status === "final" ? "final" : "provisional";
    const values = { points, maxPoints: max, percent, scaleLabel: label, status, rubricScores: v.rubricScores, latePenaltyApplied: pen, gradedBy: actor.id, gradedAt: new Date(), submissionId: sub.id, finalizedAt: status === "final" ? new Date() : null };
    let gradeId: string;
    if (existing) {
      gradeId = existing.id;
      if (Number(existing.points) !== points || existing.status !== status) {
        await tx.update(schema.grades).set(values).where(eq(schema.grades.id, existing.id));
        await tx.insert(schema.gradeHistory).values({ gradeId, oldPoints: Number(existing.points), newPoints: points, oldStatus: existing.status, newStatus: status, reason: v.reason || (status === "final" ? "Yakunlandi" : "Baho yangilandi"), changedBy: actor.id });
      } else await tx.update(schema.grades).set({ rubricScores: v.rubricScores, gradedBy: actor.id }).where(eq(schema.grades.id, existing.id));
    } else {
      const [g] = await tx.insert(schema.grades).values({ assignmentId, studentId, ...values }).returning({ id: schema.grades.id });
      gradeId = g.id;
      await tx.insert(schema.gradeHistory).values({ gradeId, oldPoints: null, newPoints: points, oldStatus: null, newStatus: status, reason: v.reason || "Birinchi baho", changedBy: actor.id });
    }
    await tx.update(schema.submissions).set({ status: status === "final" ? "graded" : "submitted", updatedAt: new Date() }).where(eq(schema.submissions.id, sub.id));
    if (v.feedback) await tx.insert(schema.feedback).values({ assignmentId, studentId, authorId: actor.id, body: v.feedback });
    await audit(actor.id, existing?.status === "final" ? "grade.change_final" : "grade.set", "grade", gradeId, { points, status, reason: v.reason || undefined }, tx);
    return { gradeId, points, percent, status, label };
  });
  if (res.status === "final") {
    await notify([studentId], { type: "grade", title: fillTemplate(settings.notificationTemplates.graded, { title: asg.title }), body: `${res.points} / ${max} ball`, link: `/assignments/${assignmentId}`, dedupeKey: `grade:${res.gradeId}:${res.points}` });
    await evaluateAchievements(studentId);
  } else if (v.feedback) {
    await notify([studentId], { type: "feedback", title: `Yangi izoh: ${asg.title}`, link: `/assignments/${assignmentId}` });
  }
  return res;
}

/** Sends work back for revision; the student may submit again. Final grades must be changed explicitly instead. */
export async function returnForRevision(actor: Actor, assignmentId: string, studentId: string, message: string) {
  const asg = await assertCanGrade(actor, assignmentId, studentId);
  const body = message.trim();
  if (body.length < 3) throw invalid("Qaytarish sababini yozing.");
  await db.transaction(async (tx) => {
    const sub = (await tx.execute<{ id: string; status: string }>(sql`select id, status from submissions where assignment_id = ${assignmentId} and student_id = ${studentId} for update`))[0];
    if (!sub || sub.status === "draft") throw new AppError("conflict", "Topshirilgan ish yo‘q.");
    const g = (await tx.select().from(schema.grades).where(and(eq(schema.grades.assignmentId, assignmentId), eq(schema.grades.studentId, studentId))))[0];
    if (g?.status === "final") throw new AppError("closed", "Yakuniy baholangan ishni qaytarib bo‘lmaydi.");
    await tx.update(schema.submissions).set({ status: "returned", updatedAt: new Date() }).where(eq(schema.submissions.id, sub.id));
    await tx.insert(schema.feedback).values({ assignmentId, studentId, authorId: actor.id, body: body.slice(0, 5000), kind: "revision_request" });
    await audit(actor.id, "submission.return", "submission", sub.id, {}, tx);
  });
  await notify([studentId], { type: "feedback", title: `Qayta ishlash so‘raldi: ${asg.title}`, body: body.slice(0, 200), link: `/assignments/${assignmentId}` });
}

export async function addFeedback(actor: Actor, assignmentId: string, studentId: string, body: string) {
  const asg = await assertCanGrade(actor, assignmentId, studentId);
  const text = body.trim();
  if (!text) throw invalid("Izoh bo‘sh.");
  await db.insert(schema.feedback).values({ assignmentId, studentId, authorId: actor.id, body: text.slice(0, 5000) });
  await notify([studentId], { type: "feedback", title: `Yangi izoh: ${asg.title}`, link: isQuizType(asg.type) ? `/quizzes/${assignmentId}` : `/assignments/${assignmentId}` });
}

/** Finalises a provisional grade (e.g. an auto-scored quiz) without changing its points. */
export async function finalizeGrade(actor: Actor, gradeId: string) {
  const [g] = await db.select().from(schema.grades).where(eq(schema.grades.id, gradeId));
  if (!g) throw notFound();
  await assertCanGrade(actor, g.assignmentId, g.studentId);
  if (g.status === "final") return;
  await db.transaction(async (tx) => {
    await tx.update(schema.grades).set({ status: "final", finalizedAt: new Date(), gradedBy: actor.id }).where(eq(schema.grades.id, gradeId));
    await tx.insert(schema.gradeHistory).values({ gradeId, oldPoints: g.points, newPoints: g.points, oldStatus: g.status, newStatus: "final", reason: "Yakunlandi", changedBy: actor.id });
    if (g.submissionId) await tx.update(schema.submissions).set({ status: "graded" }).where(eq(schema.submissions.id, g.submissionId));
    await audit(actor.id, "grade.finalize", "grade", gradeId, {}, tx);
  });
  const [asg] = await db.select().from(schema.assignments).where(eq(schema.assignments.id, g.assignmentId));
  const settings = await getSettings();
  await notify([g.studentId], { type: "grade", title: fillTemplate(settings.notificationTemplates.graded, { title: asg.title }), link: isQuizType(asg.type) ? `/quizzes/${asg.id}` : `/assignments/${asg.id}`, dedupeKey: `grade:${gradeId}:final` });
}

// ─── Lists ───────────────────────────────────────────────────────────────────

export type SubmissionQueueFilter = { status?: string; classId?: string; subjectId?: string; assignmentId?: string; q?: string };

/** Work waiting for (or already given) a grade, within the actor's scope. */
export async function submissionQueue(actor: Actor, f: SubmissionQueueFilter = {}) {
  const scope = await manageableAssignmentsWhere(actor, undefined, "a");
  const classScope = await manageableClassIds(actor);
  const rows = await db.execute<Record<string, unknown>>(sql`
    with work as (
      select s.assignment_id, s.student_id, s.status::text as status, s.submitted_at, s.is_late, s.version, 'work' as kind
      from submissions s where s.version > 0
      union all
      select qa.assignment_id, qa.student_id, case when qa.needs_manual_grading then 'submitted' else 'graded' end, qa.submitted_at, qa.is_late, qa.attempt_no, 'quiz'
      from quiz_attempts qa
      where qa.status <> 'in_progress' and qa.attempt_no = (select max(attempt_no) from quiz_attempts x where x.assignment_id = qa.assignment_id and x.student_id = qa.student_id and x.status <> 'in_progress')
    )
    select w.*, a.title, a.type, a.max_score, a.due_at, sj.name as subject_name, sj.color as subject_color,
      u.display_name as student_name, u.username,
      g.points, g.percent, g.status as grade_status, g.scale_label,
      (select string_agg(c.name, ', ' order by c.name) from class_students cs join classes c on c.id = cs.class_id where cs.student_id = w.student_id) as class_names
    from work w
    join assignments a on a.id = w.assignment_id
    join subjects sj on sj.id = a.subject_id
    join users u on u.id = w.student_id
    left join grades g on g.assignment_id = w.assignment_id and g.student_id = w.student_id
    where a.type not in ('material', 'practice') and ${scope}
      ${classScope === "all" ? sql`` : sql`and exists (select 1 from class_students cs where cs.student_id = w.student_id and cs.class_id in ${classScope.length ? classScope : ["00000000-0000-0000-0000-000000000000"]})`}
      ${f.classId ? sql`and exists (select 1 from class_students cs where cs.student_id = w.student_id and cs.class_id = ${f.classId})` : sql``}
      ${f.subjectId ? sql`and a.subject_id = ${f.subjectId}` : sql``}
      ${f.assignmentId ? sql`and a.id = ${f.assignmentId}` : sql``}
      ${f.q ? sql`and (u.display_name ilike ${"%" + f.q.replace(/[%_\\]/g, "\\$&") + "%"} or a.title ilike ${"%" + f.q.replace(/[%_\\]/g, "\\$&") + "%"})` : sql``}
      ${
        f.status === "pending"
          ? sql`and (w.status = 'submitted' and (g.id is null or g.status = 'provisional'))`
          : f.status === "graded"
            ? sql`and g.status = 'final'`
            : f.status === "returned"
              ? sql`and w.status = 'returned'`
              : sql``
      }
    order by (w.status = 'submitted' and g.id is null) desc, w.submitted_at desc
    limit 500`);
  return rows.map((r) => ({
    assignmentId: r.assignment_id as string,
    studentId: r.student_id as string,
    kind: r.kind as "work" | "quiz",
    workStatus: r.status as string,
    submittedAt: r.submitted_at ? new Date(r.submitted_at as string) : null,
    isLate: r.is_late as boolean,
    title: r.title as string,
    type: r.type as string,
    maxScore: Number(r.max_score),
    subjectName: r.subject_name as string,
    subjectColor: r.subject_color as string,
    studentName: r.student_name as string,
    classNames: (r.class_names as string) ?? "",
    points: r.points == null ? null : Number(r.points),
    percent: r.percent == null ? null : Number(r.percent),
    gradeStatus: (r.grade_status as "provisional" | "final" | null) ?? null,
    scaleLabel: (r.scale_label as string) ?? null,
  }));
}

/** Gradebook matrix for one class: students × graded assignments. */
export async function gradebook(actor: Actor, classId: string, subjectId?: string) {
  const scope = await manageableClassIds(actor);
  if (scope !== "all" && !scope.includes(classId)) throw forbidden();
  const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
  if (!cls) throw notFound();
  const assignmentScope = await manageableAssignmentsWhere(actor, undefined, "a");
  const assignments = await db.execute<{ id: string; title: string; max_score: string; due_at: string | null; subject_name: string; type: string }>(sql`
    select a.id, a.title, a.max_score, a.due_at, s.name as subject_name, a.type from assignments a join subjects s on s.id = a.subject_id
    where a.type not in ('material','practice') and a.status in ('published','archived','scheduled') and ${assignmentScope}
      and exists (select 1 from assignment_targets t where t.assignment_id = a.id and (t.class_id = ${classId} or t.student_id in (select student_id from class_students where class_id = ${classId})))
      ${subjectId ? sql`and a.subject_id = ${subjectId}` : sql``}
    order by a.due_at asc nulls last, a.created_at asc`);
  const students = await db
    .select({ id: schema.users.id, name: schema.users.displayName, username: schema.users.username, status: schema.users.status })
    .from(schema.classStudents)
    .innerJoin(schema.users, eq(schema.users.id, schema.classStudents.studentId))
    .where(eq(schema.classStudents.classId, classId))
    .orderBy(asc(schema.users.displayName));
  const ids = assignments.map((a) => a.id);
  const grades = ids.length
    ? await db.execute<{ assignment_id: string; student_id: string; points: string; percent: string; status: string; scale_label: string }>(sql`
        select assignment_id, student_id, points, percent, status, scale_label from grades
        where assignment_id in ${ids} and student_id in (select student_id from class_students where class_id = ${classId})`)
    : [];
  const map = new Map(grades.map((g) => [`${g.assignment_id}:${g.student_id}`, g]));
  return {
    cls,
    assignments: assignments.map((a) => ({ id: a.id, title: a.title, maxScore: Number(a.max_score), dueAt: a.due_at, subjectName: a.subject_name, type: a.type })),
    rows: students.map((s) => {
      const cells = assignments.map((a) => {
        const g = map.get(`${a.id}:${s.id}`);
        return g ? { points: Number(g.points), percent: Number(g.percent), status: g.status as "provisional" | "final", label: g.scale_label } : null;
      });
      const graded = cells.filter(Boolean) as { percent: number }[];
      return { student: s, cells, average: graded.length ? round2(graded.reduce((x, c) => x + c.percent, 0) / graded.length) : null };
    }),
  };
}

export async function gradebookCsv(actor: Actor, classId: string, subjectId?: string) {
  if (!can(actor, "reports.export")) throw forbidden("Eksport uchun ruxsat yo‘q.");
  const gb = await gradebook(actor, classId, subjectId);
  await audit(actor.id, "gradebook.export", "class", classId, { subjectId });
  const header = ["O‘quvchi", "Login", ...gb.assignments.map((a) => `${a.title} (${a.maxScore})`), "O‘rtacha %"];
  const rows = gb.rows.map((r) => [r.student.name, r.student.username, ...r.cells.map((c) => (c ? `${c.points}${c.status === "provisional" ? "*" : ""}` : "")), r.average ?? ""]);
  return { filename: `baholar-${gb.cls.name.replace(/[^\p{L}\p{N}]+/gu, "-")}.csv`, rows: [header, ...rows, [], ["* — dastlabki (yakunlanmagan) baho"]] };
}

// ─── Student view ────────────────────────────────────────────────────────────

export async function studentGrades(studentId: string) {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select g.id, g.points, g.max_points, g.percent, g.status, g.scale_label, g.graded_at, g.late_penalty_applied,
      a.id as assignment_id, a.title, a.type, a.due_at, s.name as subject_name, s.color as subject_color, s.id as subject_id,
      (select count(*)::int from feedback f where f.assignment_id = a.id and f.student_id = ${studentId}) as feedback_count,
      (select qa.id from quiz_attempts qa where qa.id = g.attempt_id) as attempt_id
    from grades g join assignments a on a.id = g.assignment_id join subjects s on s.id = a.subject_id
    where g.student_id = ${studentId}
    order by g.graded_at desc`);
  return rows.map((r) => ({
    id: r.id as string,
    points: Number(r.points),
    maxPoints: Number(r.max_points),
    percent: Number(r.percent),
    status: r.status as "provisional" | "final",
    label: r.scale_label as string,
    gradedAt: new Date(r.graded_at as string),
    latePenalty: Number(r.late_penalty_applied),
    assignmentId: r.assignment_id as string,
    title: r.title as string,
    type: r.type as string,
    subjectId: r.subject_id as string,
    subjectName: r.subject_name as string,
    subjectColor: r.subject_color as string,
    feedbackCount: r.feedback_count as number,
    attemptId: (r.attempt_id as string) ?? null,
  }));
}

export function canSeeAllGrades(a: Actor) {
  return isAdmin(a);
}
