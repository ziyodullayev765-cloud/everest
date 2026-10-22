import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db, schema, type Executor } from "../db";
import type { QuestionConfig } from "../db/schema";
import { can, isAdmin, type Actor } from "../auth/rbac";
import { forbidden, invalid, notFound, AppError } from "../errors";
import { assignmentInput, questionsInput, type QuestionInput } from "@/lib/validation/assignment";
import { deriveStatus, isQuizType, type StudentStatus } from "@/lib/assignment-kinds";
import { fromLocalInput } from "@/lib/dates";
import { randomUUID } from "node:crypto";
import { assertCanManageAssignment, assertStudentCanSee, liveWhere, manageableAssignmentsWhere, manageableClassIds, targetsStudent } from "./access";
import { assertOwnFiles } from "./files";
import { booksByIds } from "./library";
import { audit } from "./audit";
import { notify } from "./notifications";
import { fillTemplate, getSettings } from "./settings";
import { CATEGORY_CODES } from "@/lib/course";
import { tr } from "@/lib/i18n/tr";

// ─── Staff: create / update ──────────────────────────────────────────────────

export async function assertTargetsInScope(actor: Actor, classIds: string[], studentIds: string[], ex: Executor) {
  const scope = await manageableClassIds(actor, ex);
  if (scope === "all") return;
  if (classIds.some((c) => !scope.includes(c))) throw forbidden(tr("Siz faqat o‘zingizga biriktirilgan guruhlarga vazifa bera olasiz."));
  if (studentIds.length) {
    const rows = scope.length
      ? await ex
          .selectDistinct({ id: schema.classStudents.studentId })
          .from(schema.classStudents)
          .where(and(inArray(schema.classStudents.studentId, studentIds), inArray(schema.classStudents.classId, scope)))
      : [];
    if (rows.length !== new Set(studentIds).size) throw forbidden(tr("Tanlangan o‘quvchilardan ba’zilari sizning guruhlaringizda emas."));
  }
}

function toRow(v: ReturnType<typeof assignmentInput.parse>) {
  const dueAt = fromLocalInput(v.dueAt);
  const publishAt = v.publishMode === "schedule" ? fromLocalInput(v.publishAt) : null;
  if (v.publishMode === "schedule" && publishAt && publishAt.getTime() < Date.now() - 60_000) throw invalid(tr("Rejalashtirilgan vaqt kelajakda bo‘lishi kerak."));
  if (dueAt && publishAt && dueAt <= publishAt) throw invalid(tr("Muddat e’lon qilish vaqtidan keyin bo‘lishi kerak."));
  const quiz = isQuizType(v.type);
  return {
    title: v.title,
    description: v.description,
    instructions: v.instructions,
    type: v.type,
    subjectId: v.subjectId,
    dueAt,
    publishAt,
    status: (v.publishMode === "draft" ? "draft" : v.publishMode === "now" ? "published" : "scheduled") as "draft" | "published" | "scheduled",
    maxScore: v.maxScore,
    allowLate: v.allowLate,
    latePenaltyPercent: v.latePenaltyPercent,
    lateCutoffAt: v.allowLate ? fromLocalInput(v.lateCutoffAt) : null,
    allowResubmission: v.allowResubmission,
    maxResubmissions: v.allowResubmission ? Math.max(1, v.maxResubmissions) : 0,
    timeLimitMinutes: quiz ? (v.type === "timed_quiz" ? (v.timeLimitMinutes ?? 20) : v.timeLimitMinutes) : null,
    maxAttempts: quiz ? (v.type === "practice" ? Math.max(v.maxAttempts, 5) : v.maxAttempts) : 1,
    passingPercent: v.passingPercent,
    shuffleQuestions: v.shuffleQuestions,
    shuffleOptions: v.shuffleOptions,
    allowBackNavigation: v.allowBackNavigation,
    showOverview: v.showOverview,
    reviewMode: v.reviewMode,
    showCorrectAnswers: v.showCorrectAnswers,
    links: v.links,
    rubric: v.rubric,
    items: v.type === "homework" ? v.items.map((i) => ({ ...i, bookId: i.bookId ?? null })) : [],
    level: v.level,
    topic: v.topic,
    passage: v.passage,
    audioFileId: v.audioFileId,
    transcript: v.transcript,
    transcriptMode: v.transcriptMode,
    replayLimit: v.audioFileId ? v.replayLimit : null,
  };
}

export async function saveAssignment(actor: Actor, id: string | null, input: unknown) {
  if (!can(actor, "assignments.create")) throw forbidden(tr("Vazifa yaratish uchun ruxsat yo‘q."));
  const parsed = assignmentInput.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[i.path.join(".") || "_"] ??= i.message;
    throw invalid(parsed.error.issues[0]?.message ?? tr("Ma’lumotlar noto‘g‘ri"), fields);
  }
  const v = parsed.data;
  await assertOwnFilesOrAttached(actor, id, v.attachmentFileIds);
  if (v.audioFileId) await assertAudioFile(actor, id, v.audioFileId);
  const row = toRow(v);
  const bookIds = [...new Set(row.items.map((i) => i.bookId).filter((x): x is string => !!x))];
  if (bookIds.length) {
    const found = await db.select({ id: schema.books.id }).from(schema.books).where(inArray(schema.books.id, bookIds));
    if (found.length !== bookIds.length) throw invalid(tr("Tanlangan kitob topilmadi."));
  }

  const result = await db.transaction(async (tx) => {
    await assertTargetsInScope(actor, v.classIds, v.studentIds, tx);
    const subject = await tx.select().from(schema.subjects).where(eq(schema.subjects.id, v.subjectId)).limit(1);
    if (!subject[0] || subject[0].archivedAt) throw invalid(tr("Kategoriya topilmadi."));

    let assignmentId = id;
    let wasLive = false;
    if (id) {
      const existing = await assertCanManageAssignment(actor, id, tx);
      if (existing.status === "archived") throw new AppError("closed", tr("Arxivlangan vazifani tahrirlab bo‘lmaydi. Avval tiklang."));
      wasLive = existing.status === "published";
      if (existing.type !== v.type && (await hasStudentWork(id, tx))) throw invalid(tr("O‘quvchilar ishlay boshlagan vazifaning turini o‘zgartirib bo‘lmaydi."));
      // Keep publication history: once published it stays published (unless archived explicitly).
      const status = wasLive ? "published" : row.status;
      await tx
        .update(schema.assignments)
        .set({ ...row, status, publishedAt: status === "published" ? (existing.publishedAt ?? new Date()) : null, updatedAt: new Date() })
        .where(eq(schema.assignments.id, id));
      await tx.delete(schema.assignmentTargets).where(eq(schema.assignmentTargets.assignmentId, id));
      await tx.delete(schema.assignmentAttachments).where(eq(schema.assignmentAttachments.assignmentId, id));
    } else {
      const [created] = await tx
        .insert(schema.assignments)
        .values({ ...row, createdBy: actor.id, publishedAt: row.status === "published" ? new Date() : null })
        .returning({ id: schema.assignments.id });
      assignmentId = created.id;
    }
    const targets = [...v.classIds.map((classId) => ({ assignmentId: assignmentId!, classId })), ...v.studentIds.map((studentId) => ({ assignmentId: assignmentId!, studentId }))];
    if (targets.length) await tx.insert(schema.assignmentTargets).values(targets);
    if (v.attachmentFileIds.length)
      await tx.insert(schema.assignmentAttachments).values(v.attachmentFileIds.map((fileId, position) => ({ assignmentId: assignmentId!, fileId, position })));

    if (row.status === "published" && isQuizType(v.type)) {
      const q = await tx.select({ n: sql<number>`count(*)::int` }).from(schema.questions).where(eq(schema.questions.assignmentId, assignmentId!));
      if ((q[0]?.n ?? 0) === 0 && !wasLive) {
        // Can't publish an empty quiz — keep it as a draft and tell the author.
        await tx.update(schema.assignments).set({ status: "draft", publishedAt: null }).where(eq(schema.assignments.id, assignmentId!));
        return { id: assignmentId!, publishedNow: false, keptDraft: true };
      }
    }
    await audit(actor.id, id ? "assignment.update" : "assignment.create", "assignment", assignmentId, { status: row.status, title: v.title }, tx);
    return { id: assignmentId!, publishedNow: row.status === "published" && !wasLive, keptDraft: false };
  });
  if (result.publishedNow) await announcePublished(result.id);
  return result;
}

async function assertOwnFilesOrAttached(actor: Actor, assignmentId: string | null, fileIds: string[]) {
  if (!fileIds.length) return;
  const already = assignmentId
    ? (await db.select({ id: schema.assignmentAttachments.fileId }).from(schema.assignmentAttachments).where(eq(schema.assignmentAttachments.assignmentId, assignmentId))).map((r) => r.id)
    : [];
  await assertOwnFiles(actor.id, fileIds.filter((f) => !already.includes(f)));
}

async function assertAudioFile(actor: Actor, assignmentId: string | null, fileId: string) {
  const [f] = await db.select({ mime: schema.files.mime }).from(schema.files).where(eq(schema.files.id, fileId));
  if (!f || !f.mime.startsWith("audio/")) throw invalid(tr("Listening uchun audio fayl tanlang."));
  if (assignmentId) {
    const [cur] = await db.select({ a: schema.assignments.audioFileId }).from(schema.assignments).where(eq(schema.assignments.id, assignmentId));
    if (cur?.a === fileId) return;
  }
  await assertOwnFiles(actor.id, [fileId]);
}

async function hasStudentWork(assignmentId: string, ex: Executor) {
  const r = await ex.execute<{ n: number }>(sql`
    select (select count(*) from submissions where assignment_id = ${assignmentId})::int + (select count(*) from quiz_attempts where assignment_id = ${assignmentId})::int as n`);
  return Number(r[0]?.n ?? 0) > 0;
}

/** Replaces the question set. Locked once any student has started an attempt (history must stay intact). */
export async function saveQuestions(actor: Actor, assignmentId: string, input: unknown) {
  const asg = await assertCanManageAssignment(actor, assignmentId);
  if (!isQuizType(asg.type)) throw invalid(tr("Bu vazifa turi savollarni qo‘llab-quvvatlamaydi."));
  const parsed = questionsInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const idx = typeof issue?.path[0] === "number" ? `${(issue.path[0] as number) + 1}-savol: ` : "";
    throw invalid(idx + (issue?.message ?? tr("Savollar noto‘g‘ri")));
  }
  const attempts = await db.select({ n: sql<number>`count(*)::int` }).from(schema.quizAttempts).where(eq(schema.quizAttempts.assignmentId, assignmentId));
  if ((attempts[0]?.n ?? 0) > 0) throw new AppError("closed", tr("O‘quvchilar quizni boshlagan. Savollarni o‘zgartirish uchun nusxa yarating."));
  const imageIds = parsed.data.flatMap((q) => [q.imageFileId, q.audioFileId]).filter((x): x is string => !!x);
  const existingRows = await db.select({ id: schema.questions.imageFileId, config: schema.questions.config }).from(schema.questions).where(eq(schema.questions.assignmentId, assignmentId));
  const existingImages = existingRows.flatMap((r) => [r.id, (r.config as QuestionConfig).audioFileId]);
  await assertOwnFiles(actor.id, imageIds.filter((i) => !existingImages.includes(i)));

  await db.transaction(async (tx) => {
    await tx.delete(schema.questions).where(eq(schema.questions.assignmentId, assignmentId));
    await insertQuestions(tx, actor.id, parsed.data, { assignmentId });
    const total = parsed.data.reduce((s, q) => s + q.points, 0);
    // A quiz's maximum score is always the sum of its question points.
    await tx.update(schema.assignments).set({ maxScore: Math.max(1, total), updatedAt: new Date() }).where(eq(schema.assignments.id, assignmentId));
    await audit(actor.id, "assignment.questions", "assignment", assignmentId, { count: parsed.data.length }, tx);
  });
}

/** Stored answer key / settings per question type (never sent to students before review). */
function questionConfig(q: QuestionInput): QuestionConfig {
  const one = [q.accepted.flat()];
  switch (q.type) {
    case "matching":
      return { pairs: q.pairs.map((p) => ({ id: randomUUID().slice(0, 8), left: p.left, right: p.right })) };
    case "short_answer":
      return { accepted: one, caseSensitive: q.caseSensitive };
    case "fill_blank":
      return { accepted: q.accepted, caseSensitive: q.caseSensitive };
    case "translation":
      return { accepted: one, direction: q.direction ?? "en_uz" };
    case "grammar_correction":
      return { accepted: one, incorrect: q.incorrect };
    case "arrange_words":
      // Alternatives (if any) are extra accepted sentences; the main one is the words in order.
      return { words: q.words, accepted: [[q.words.join(" "), ...q.accepted.flat()]] };
    case "irregular_verb":
      return { base: q.base, accepted: q.accepted.slice(0, 2) };
    default:
      return {};
  }
}

export async function insertQuestions(tx: Executor, ownerId: string, qs: QuestionInput[], target: { assignmentId?: string; bankSubjectId?: string }) {
  for (const [position, q] of qs.entries()) {
    const config = { ...questionConfig(q), ...(q.audioFileId ? { audioFileId: q.audioFileId } : {}) };
    const [row] = await tx
      .insert(schema.questions)
      .values({
        assignmentId: target.assignmentId ?? null,
        bankSubjectId: target.bankSubjectId ?? null,
        ownerId,
        position,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        explanation: q.explanation,
        imageFileId: q.imageFileId,
        config,
      })
      .returning({ id: schema.questions.id });
    const opts = q.type === "single_choice" || q.type === "multiple_choice" || q.type === "true_false" ? q.options : [];
    if (opts.length) await tx.insert(schema.questionOptions).values(opts.map((o, i) => ({ questionId: row.id, position: i, label: o.label, isCorrect: o.isCorrect })));
  }
}

export async function setAssignmentStatus(actor: Actor, id: string, action: "publish" | "archive" | "restore" | "unpublish") {
  const asg = await assertCanManageAssignment(actor, id);
  let status = asg.status;
  if (action === "publish") {
    const targets = await db.select().from(schema.assignmentTargets).where(eq(schema.assignmentTargets.assignmentId, id));
    if (!targets.length) throw invalid(tr("E’lon qilishdan oldin guruh yoki o‘quvchini tanlang."));
    if (isQuizType(asg.type)) {
      const q = await db.select({ n: sql<number>`count(*)::int` }).from(schema.questions).where(eq(schema.questions.assignmentId, id));
      if (!q[0]?.n) throw invalid(tr("Quizda kamida bitta savol bo‘lishi kerak."));
    }
    status = "published";
  } else if (action === "archive") status = "archived";
  else if (action === "restore") status = asg.publishedAt ? "published" : "draft";
  else if (action === "unpublish") {
    if (await hasStudentWork(id, db)) throw new AppError("closed", tr("O‘quvchilar ishlagan vazifani qoralamaga qaytarib bo‘lmaydi. Uni arxivlang."));
    status = "draft";
  }
  await db
    .update(schema.assignments)
    .set({
      status,
      publishedAt: status === "published" ? (asg.publishedAt ?? new Date()) : status === "draft" ? null : asg.publishedAt,
      archivedAt: status === "archived" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.assignments.id, id));
  await audit(actor.id, `assignment.${action}`, "assignment", id);
  if (action === "publish" && asg.status !== "published") await announcePublished(id);
}

export async function duplicateAssignment(actor: Actor, id: string) {
  if (!can(actor, "assignments.create")) throw forbidden();
  const asg = await assertCanManageAssignment(actor, id);
  return db.transaction(async (tx) => {
    const { id: _id, createdAt: _c, updatedAt: _u, publishedAt: _p, archivedAt: _a, ...rest } = asg;
    void _id; void _c; void _u; void _p; void _a;
    const [copy] = await tx
      .insert(schema.assignments)
      .values({ ...rest, title: `${asg.title} (nusxa)`, status: "draft", publishAt: null, createdBy: actor.id })
      .returning({ id: schema.assignments.id });
    const targets = await tx.select().from(schema.assignmentTargets).where(eq(schema.assignmentTargets.assignmentId, id));
    if (targets.length) await tx.insert(schema.assignmentTargets).values(targets.map((t) => ({ assignmentId: copy.id, classId: t.classId, studentId: t.studentId })));
    const atts = await tx.select().from(schema.assignmentAttachments).where(eq(schema.assignmentAttachments.assignmentId, id));
    if (atts.length) await tx.insert(schema.assignmentAttachments).values(atts.map((a) => ({ ...a, assignmentId: copy.id })));
    const qs = await tx.select().from(schema.questions).where(eq(schema.questions.assignmentId, id)).orderBy(asc(schema.questions.position));
    for (const q of qs) {
      const { id: qid, createdAt: _qc, ...qrest } = q;
      void _qc;
      const [nq] = await tx.insert(schema.questions).values({ ...qrest, assignmentId: copy.id, ownerId: actor.id }).returning({ id: schema.questions.id });
      const opts = await tx.select().from(schema.questionOptions).where(eq(schema.questionOptions.questionId, qid));
      if (opts.length) await tx.insert(schema.questionOptions).values(opts.map((o) => ({ questionId: nq.id, position: o.position, label: o.label, isCorrect: o.isCorrect })));
    }
    await audit(actor.id, "assignment.duplicate", "assignment", copy.id, { from: id }, tx);
    return copy.id;
  });
}

/** Notifies targeted students once per assignment (dedupe key). */
export async function announcePublished(assignmentId: string) {
  const [asg] = await db.select().from(schema.assignments).where(eq(schema.assignments.id, assignmentId));
  if (!asg) return;
  const students = await targetedStudentIds(assignmentId);
  const settings = await getSettings();
  const quiz = isQuizType(asg.type);
  await notify(students, {
    type: "new_assignment",
    title: fillTemplate(settings.notificationTemplates.newAssignment, { title: asg.title }),
    body: quiz ? "Yangi quiz sizni kutmoqda." : "Batafsil ma’lumot uchun oching.",
    link: quiz ? `/quizzes/${asg.id}` : `/assignments/${asg.id}`,
    dedupeKey: `published:${asg.id}`,
  });
}

export async function targetedStudentIds(assignmentId: string, ex: Executor = db): Promise<string[]> {
  const rows = await ex.execute<{ id: string }>(sql`
    select distinct u.id from users u
    where u.role = 'student' and u.status = 'active' and (
      u.id in (select student_id from assignment_targets where assignment_id = ${assignmentId} and student_id is not null)
      or u.id in (select cs.student_id from class_students cs join assignment_targets t on t.class_id = cs.class_id where t.assignment_id = ${assignmentId})
    )`);
  return rows.map((r) => r.id);
}

/** Moves due scheduled assignments to published and announces them. Throttled per instance. */
let lastPromotion = 0;
export async function promoteScheduled(force = false) {
  if (!force && Date.now() - lastPromotion < 30_000) return 0;
  lastPromotion = Date.now();
  const rows = await db
    .update(schema.assignments)
    .set({ status: "published", publishedAt: sql`${schema.assignments.publishAt}` })
    .where(and(eq(schema.assignments.status, "scheduled"), sql`${schema.assignments.publishAt} <= now()`))
    .returning({ id: schema.assignments.id });
  for (const r of rows) await announcePublished(r.id);
  return rows.length;
}

// ─── Staff: reading ──────────────────────────────────────────────────────────

export async function listForStaff(actor: Actor, filter: { status?: string; type?: string; subjectId?: string; q?: string } = {}) {
  const scope = await manageableAssignmentsWhere(actor);
  const conds = [scope];
  if (filter.status && ["draft", "scheduled", "published", "archived"].includes(filter.status)) conds.push(sql`${schema.assignments.status} = ${filter.status}`);
  else conds.push(ne(schema.assignments.status, "archived"));
  if (filter.type === "quiz") conds.push(sql`${schema.assignments.type} in ('multiple_choice','short_answer','true_false','timed_quiz','practice')`);
  if (filter.type === "work") conds.push(sql`${schema.assignments.type} not in ('multiple_choice','short_answer','true_false','timed_quiz','practice')`);
  if (filter.subjectId) conds.push(eq(schema.assignments.subjectId, filter.subjectId));
  if (filter.q) conds.push(sql`${schema.assignments.title} ilike ${"%" + filter.q.replace(/[%_\\]/g, "\\$&") + "%"}`);
  return db
    .select({
      id: schema.assignments.id,
      title: schema.assignments.title,
      type: schema.assignments.type,
      status: schema.assignments.status,
      dueAt: schema.assignments.dueAt,
      publishAt: schema.assignments.publishAt,
      maxScore: schema.assignments.maxScore,
      updatedAt: schema.assignments.updatedAt,
      subjectName: schema.subjects.name,
      subjectColor: schema.subjects.color,
      authorName: schema.users.displayName,
      targetCount: sql<number>`(select count(*)::int from assignment_targets t where t.assignment_id = ${schema.assignments.id})`,
      submittedCount: sql<number>`(
        (select count(*)::int from submissions s where s.assignment_id = ${schema.assignments.id} and s.version > 0)
        + (select count(distinct student_id)::int from quiz_attempts qa where qa.assignment_id = ${schema.assignments.id} and qa.status <> 'in_progress'))`,
      pendingCount: sql<number>`(
        (select count(*)::int from submissions s where s.assignment_id = ${schema.assignments.id} and s.status = 'submitted')
        + (select count(*)::int from quiz_attempts qa where qa.assignment_id = ${schema.assignments.id} and qa.status = 'submitted' and qa.needs_manual_grading))`,
    })
    .from(schema.assignments)
    .innerJoin(schema.subjects, eq(schema.subjects.id, schema.assignments.subjectId))
    .innerJoin(schema.users, eq(schema.users.id, schema.assignments.createdBy))
    .where(and(...conds))
    .orderBy(desc(schema.assignments.updatedAt))
    .limit(300)
    .then((rows) => rows.map((r) => ({ ...r, subjectName: tr(r.subjectName) })));
}

export async function getForEditing(actor: Actor, id: string) {
  const asg = await assertCanManageAssignment(actor, id);
  const [targets, attachments, qs] = await Promise.all([
    db.select().from(schema.assignmentTargets).where(eq(schema.assignmentTargets.assignmentId, id)),
    db
      .select({ id: schema.files.id, name: schema.files.name, mime: schema.files.mime, size: schema.files.size })
      .from(schema.assignmentAttachments)
      .innerJoin(schema.files, eq(schema.files.id, schema.assignmentAttachments.fileId))
      .where(eq(schema.assignmentAttachments.assignmentId, id))
      .orderBy(asc(schema.assignmentAttachments.position)),
    questionsWithOptions(id),
  ]);
  const attemptCount = (await db.select({ n: sql<number>`count(*)::int` }).from(schema.quizAttempts).where(eq(schema.quizAttempts.assignmentId, id)))[0]?.n ?? 0;
  const audio = asg.audioFileId
    ? ((await db.select({ id: schema.files.id, name: schema.files.name, mime: schema.files.mime, size: schema.files.size }).from(schema.files).where(eq(schema.files.id, asg.audioFileId)))[0] ?? null)
    : null;
  return { assignment: asg, targets, attachments, audio, questions: qs, questionsLocked: attemptCount > 0 };
}

export async function questionsWithOptions(assignmentId: string, ex: Executor = db) {
  const qs = await ex.select().from(schema.questions).where(eq(schema.questions.assignmentId, assignmentId)).orderBy(asc(schema.questions.position));
  if (!qs.length) return [];
  const opts = await ex
    .select()
    .from(schema.questionOptions)
    .where(inArray(schema.questionOptions.questionId, qs.map((q) => q.id)))
    .orderBy(asc(schema.questionOptions.position));
  return qs.map((q) => ({ ...q, options: opts.filter((o) => o.questionId === q.id) }));
}

// ─── Students ────────────────────────────────────────────────────────────────

export type StudentAssignmentRow = {
  id: string;
  title: string;
  type: (typeof schema.assignmentTypeEnum.enumValues)[number];
  dueAt: Date | null;
  publishedAt: Date | null;
  maxScore: number;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  /** English category code (GRAMMAR, READING, …). */
  category: string;
  level: string;
  topic: string;
  hasAudio: boolean;
  hasPassage: boolean;
  /** Best scored attempt (quizzes and practice), as a percent. */
  bestPercent: number | null;
  authorName: string;
  status: StudentStatus;
  gradePercent: number | null;
  gradePoints: number | null;
  gradeStatus: "provisional" | "final" | null;
  scaleLabel: string | null;
  allowLate: boolean;
  lateCutoffAt: Date | null;
  timeLimitMinutes: number | null;
  questionCount: number;
  attemptsUsed: number;
  maxAttempts: number;
};

export async function listForStudent(studentId: string): Promise<StudentAssignmentRow[]> {
  await promoteScheduled();
  const rows = await db.execute<Record<string, unknown>>(sql`
    select a.id, a.title, a.type, a.due_at, a.published_at, a.publish_at, a.max_score, a.allow_late, a.late_cutoff_at, a.time_limit_minutes, a.max_attempts,
      s.id as subject_id, s.name as subject_name, s.color as subject_color, s.code as category, a.level, a.topic,
      a.audio_file_id is not null as has_audio, a.passage <> '' as has_passage, u.display_name as author_name,
      (select max(round(100 * qa.score / nullif(qa.max_score, 0))) from quiz_attempts qa where qa.assignment_id = a.id and qa.student_id = ${studentId} and qa.status = 'graded')::int as best_percent,
      sub.status as sub_status, sub.version as sub_version,
      g.percent as grade_percent, g.points as grade_points, g.status as grade_status, g.scale_label,
      (select count(*)::int from questions q where q.assignment_id = a.id) as question_count,
      (select count(*)::int from quiz_attempts qa where qa.assignment_id = a.id and qa.student_id = ${studentId}) as attempts_used,
      exists (select 1 from quiz_attempts qa where qa.assignment_id = a.id and qa.student_id = ${studentId} and qa.status = 'in_progress') as open_attempt,
      (select count(*)::int from quiz_attempts qa where qa.assignment_id = a.id and qa.student_id = ${studentId} and qa.status <> 'in_progress') as submitted_attempts,
      exists (select 1 from quiz_attempts qa where qa.assignment_id = a.id and qa.student_id = ${studentId} and qa.status = 'submitted' and qa.needs_manual_grading) as pending_manual
    from assignments a
    join subjects s on s.id = a.subject_id
    join users u on u.id = a.created_by
    left join submissions sub on sub.assignment_id = a.id and sub.student_id = ${studentId}
    left join grades g on g.assignment_id = a.id and g.student_id = ${studentId}
    where ${liveWhere("a")} and ${targetsStudent(studentId, "a")}
    order by a.due_at asc nulls last, a.created_at desc
    limit 500`);
  return rows.map((r) => {
    const type = r.type as StudentAssignmentRow["type"];
    const dueAt = r.due_at ? new Date(r.due_at as string) : null;
    return {
      id: r.id as string,
      title: r.title as string,
      type,
      dueAt,
      publishedAt: r.published_at ? new Date(r.published_at as string) : r.publish_at ? new Date(r.publish_at as string) : null,
      maxScore: Number(r.max_score),
      subjectId: r.subject_id as string,
      subjectName: tr(r.subject_name as string),
      subjectColor: r.subject_color as string,
      category: r.category as string,
      level: (r.level as string) ?? "",
      topic: (r.topic as string) ?? "",
      hasAudio: !!r.has_audio,
      hasPassage: !!r.has_passage,
      bestPercent: r.best_percent == null ? null : Number(r.best_percent),
      authorName: r.author_name as string,
      gradePercent: r.grade_percent == null ? null : Number(r.grade_percent),
      gradePoints: r.grade_points == null ? null : Number(r.grade_points),
      gradeStatus: (r.grade_status as "provisional" | "final" | null) ?? null,
      scaleLabel: (r.scale_label as string | null) ?? null,
      allowLate: r.allow_late as boolean,
      lateCutoffAt: r.late_cutoff_at ? new Date(r.late_cutoff_at as string) : null,
      timeLimitMinutes: (r.time_limit_minutes as number | null) ?? null,
      questionCount: r.question_count as number,
      attemptsUsed: r.attempts_used as number,
      maxAttempts: r.max_attempts as number,
      status: deriveStatus({
        type,
        dueAt,
        submission: r.sub_status ? { status: r.sub_status as "draft", version: r.sub_version as number } : null,
        attempts: { open: r.open_attempt as boolean, submitted: r.submitted_attempts as number, pendingManual: r.pending_manual as boolean },
        grade: r.grade_status ? { status: r.grade_status as "final" } : null,
      }),
    };
  });
}

export async function getForStudent(studentId: string, assignmentId: string) {
  await promoteScheduled();
  const asg = await assertStudentCanSee(studentId, assignmentId);
  const [subject, author, attachments, submission, grade, fb] = await Promise.all([
    db.select().from(schema.subjects).where(eq(schema.subjects.id, asg.subjectId)),
    db.select({ name: schema.users.displayName }).from(schema.users).where(eq(schema.users.id, asg.createdBy)),
    db
      .select({ id: schema.files.id, name: schema.files.name, mime: schema.files.mime, size: schema.files.size })
      .from(schema.assignmentAttachments)
      .innerJoin(schema.files, eq(schema.files.id, schema.assignmentAttachments.fileId))
      .where(eq(schema.assignmentAttachments.assignmentId, assignmentId))
      .orderBy(asc(schema.assignmentAttachments.position)),
    db.select().from(schema.submissions).where(and(eq(schema.submissions.assignmentId, assignmentId), eq(schema.submissions.studentId, studentId))),
    db.select().from(schema.grades).where(and(eq(schema.grades.assignmentId, assignmentId), eq(schema.grades.studentId, studentId))),
    db
      .select({ id: schema.feedback.id, body: schema.feedback.body, kind: schema.feedback.kind, createdAt: schema.feedback.createdAt, author: schema.users.displayName })
      .from(schema.feedback)
      .innerJoin(schema.users, eq(schema.users.id, schema.feedback.authorId))
      .where(and(eq(schema.feedback.assignmentId, assignmentId), eq(schema.feedback.studentId, studentId)))
      .orderBy(desc(schema.feedback.createdAt)),
  ]);
  const sub = submission[0] ?? null;
  const subFiles = sub
    ? await db
        .select({ id: schema.files.id, name: schema.files.name, mime: schema.files.mime, size: schema.files.size })
        .from(schema.submissionFiles)
        .innerJoin(schema.files, eq(schema.files.id, schema.submissionFiles.fileId))
        .where(eq(schema.submissionFiles.submissionId, sub.id))
    : [];
  const list = (await listForStudent(studentId)).find((r) => r.id === assignmentId);
  return {
    assignment: asg,
    subject: subject[0],
    authorName: author[0]?.name ?? "",
    attachments,
    submission: sub,
    submissionFiles: subFiles,
    grade: grade[0] ?? null,
    feedback: fb,
    status: list?.status ?? "new",
    books: await booksByIds([...new Set(asg.items.map((i) => i.bookId).filter((x): x is string => !!x))]),
  };
}

/** The English assignment categories (the subjects table, seeded by migration), in course order. */
export async function subjectsList(includeArchived = false) {
  const codes = sql.raw(`ARRAY[${CATEGORY_CODES.map((c) => `'${c}'`).join(",")}]::text[]`);
  return db
    .select()
    .from(schema.subjects)
    .where(includeArchived ? sql`true` : sql`${schema.subjects.archivedAt} is null`)
    .orderBy(sql`coalesce(array_position(${codes}, ${schema.subjects.code}), 999)`, asc(schema.subjects.name))
    .then((rows) => rows.map((r) => ({ ...r, name: tr(r.name) })));
}

/** Category id by code (falls back to "Boshqa mashq"). */
export async function categoryId(code: string, ex: Executor = db) {
  const rows = await ex.select({ id: schema.subjects.id, code: schema.subjects.code }).from(schema.subjects).where(inArray(schema.subjects.code, [code, "CUSTOM"]));
  const hit = rows.find((r) => r.code === code) ?? rows[0];
  if (!hit) throw invalid(tr("Kategoriyalar sozlanmagan. Migratsiyani ishga tushiring."));
  return hit.id;
}

export async function ensureCanSeeAsStaffOrStudent(actor: Actor, assignmentId: string) {
  if (actor.role === "student") return assertStudentCanSee(actor.id, assignmentId);
  if (isAdmin(actor)) {
    const r = await db.select().from(schema.assignments).where(eq(schema.assignments.id, assignmentId));
    if (!r[0]) throw notFound();
    return r[0];
  }
  return assertCanManageAssignment(actor, assignmentId);
}
