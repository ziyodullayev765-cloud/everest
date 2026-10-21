import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema, type Executor, type Tx } from "../db";
import type { Actor } from "../auth/rbac";
import { AppError, forbidden, invalid, notFound } from "../errors";
import { keyedHash } from "../crypto";
import { isGradedType, isQuizType, submissionWindow } from "@/lib/assignment-kinds";
import { bandFor, latePenalty, percentOf, round2 } from "@/lib/grading";
import { quizXp } from "@/lib/gamification";
import { countBlanks, scoreQuestion, seededShuffle } from "@/lib/scoring";
import type { Assignment, QuestionConfig } from "../db/schema";
import { assertCanGrade, assertStudentCanSee } from "./access";
import { questionsWithOptions } from "./assignments";
import { awardXp, evaluateAchievements } from "./gamification";
import { notify, teachersFor } from "./notifications";
import { getSettings } from "./settings";
import { audit } from "./audit";

const GRACE_MS = 15_000;

type QWithOptions = Awaited<ReturnType<typeof questionsWithOptions>>[number];

/** Token shown to the client for the right-hand side of a matching pair (doesn't reveal the pairing). */
const matchToken = (attemptId: string, pairId: string) => keyedHash(`match:${attemptId}:${pairId}`).slice(0, 12);

function requireStudent(actor: Actor) {
  if (actor.role !== "student") throw forbidden("Quizni faqat o‘quvchilar topshiradi.");
}

async function loadAttemptForStudent(studentId: string, attemptId: string, ex: Executor = db) {
  const rows = await ex.select().from(schema.quizAttempts).where(eq(schema.quizAttempts.id, attemptId)).limit(1);
  const att = rows[0];
  if (!att || att.studentId !== studentId) throw notFound("Urinish topilmadi.");
  return att;
}

// ─── Overview & start ────────────────────────────────────────────────────────

export async function quizOverview(actor: Actor, assignmentId: string) {
  requireStudent(actor);
  const asg = await assertStudentCanSee(actor.id, assignmentId);
  if (!isQuizType(asg.type)) throw notFound();
  const [qs, attempts, subject] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int`, pts: sql<number>`coalesce(sum(points),0)::float` })
      .from(schema.questions)
      .where(eq(schema.questions.assignmentId, assignmentId)),
    db
      .select()
      .from(schema.quizAttempts)
      .where(and(eq(schema.quizAttempts.assignmentId, assignmentId), eq(schema.quizAttempts.studentId, actor.id)))
      .orderBy(desc(schema.quizAttempts.attemptNo)),
    db.select().from(schema.subjects).where(eq(schema.subjects.id, asg.subjectId)),
  ]);
  // Close any attempt whose timer ran out while the student was away.
  for (const a of attempts) if (a.status === "in_progress" && isExpired(a)) await submitAttempt(actor, a.id, undefined, { expired: true });
  const fresh = attempts.some((a) => a.status === "in_progress" && isExpired(a))
    ? await db
        .select()
        .from(schema.quizAttempts)
        .where(and(eq(schema.quizAttempts.assignmentId, assignmentId), eq(schema.quizAttempts.studentId, actor.id)))
        .orderBy(desc(schema.quizAttempts.attemptNo))
    : attempts;
  const open = fresh.find((a) => a.status === "in_progress") ?? null;
  const win = submissionWindow(asg);
  const used = fresh.length;
  let blocker: string | null = null;
  if (!open) {
    if (!win.open) blocker = "Quiz muddati tugagan.";
    else if (used >= asg.maxAttempts) blocker = "Urinishlar soni tugagan.";
    else if ((qs[0]?.n ?? 0) === 0) blocker = "Quizda hali savollar yo‘q.";
  }
  const grade = (await db.select().from(schema.grades).where(and(eq(schema.grades.assignmentId, assignmentId), eq(schema.grades.studentId, actor.id))))[0] ?? null;
  return {
    assignment: asg,
    subject: subject[0],
    questionCount: qs[0]?.n ?? 0,
    totalPoints: qs[0]?.pts ?? 0,
    attempts: fresh,
    openAttempt: open,
    attemptsLeft: Math.max(0, asg.maxAttempts - used),
    canStart: !open && !blocker,
    blocker,
    isLateWindow: win.late,
    grade,
  };
}

function isExpired(a: { expiresAt: Date | null }, now = Date.now()) {
  return !!a.expiresAt && now > a.expiresAt.getTime() + GRACE_MS;
}

export async function startAttempt(actor: Actor, assignmentId: string) {
  requireStudent(actor);
  const asg = await assertStudentCanSee(actor.id, assignmentId);
  if (!isQuizType(asg.type)) throw invalid("Bu quiz emas.");
  const qs = await questionsWithOptions(assignmentId);
  if (qs.length === 0) throw new AppError("closed", "Quizda hali savollar yo‘q.");

  return db.transaction(async (tx) => {
    // Serialise per student+quiz so two tabs can't open two attempts.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"attempt:" + assignmentId + ":" + actor.id}))`);
    const existing = await tx
      .select()
      .from(schema.quizAttempts)
      .where(and(eq(schema.quizAttempts.assignmentId, assignmentId), eq(schema.quizAttempts.studentId, actor.id)))
      .orderBy(desc(schema.quizAttempts.attemptNo));
    const open = existing.find((a) => a.status === "in_progress");
    if (open && !isExpired(open)) return { attemptId: open.id, resumed: true };
    if (open) throw new AppError("conflict", "Oldingi urinish vaqti tugagan. Sahifani yangilang.");
    const win = submissionWindow(asg);
    if (!win.open) throw new AppError("closed", "Quiz muddati tugagan.");
    if (existing.length >= asg.maxAttempts) throw new AppError("closed", "Urinishlar soni tugagan.");

    const attemptId = crypto.randomUUID();
    const questionOrder = asg.shuffleQuestions ? seededShuffle(qs.map((q) => q.id), attemptId) : qs.map((q) => q.id);
    const optionOrder: Record<string, string[]> = {};
    for (const q of qs) {
      if (q.options.length) optionOrder[q.id] = asg.shuffleOptions && q.type !== "true_false" ? seededShuffle(q.options.map((o) => o.id), attemptId + q.id) : q.options.map((o) => o.id);
    }
    const now = new Date();
    let expiresAt = asg.timeLimitMinutes ? new Date(now.getTime() + asg.timeLimitMinutes * 60_000) : null;
    const hardStop = asg.dueAt && !asg.allowLate ? asg.dueAt : asg.lateCutoffAt;
    if (hardStop && (!expiresAt || hardStop < expiresAt)) expiresAt = hardStop;
    await tx.insert(schema.quizAttempts).values({
      id: attemptId,
      assignmentId,
      studentId: actor.id,
      attemptNo: (existing[0]?.attemptNo ?? 0) + 1,
      questionOrder,
      optionOrder,
      startedAt: now,
      expiresAt,
      maxScore: round2(qs.reduce((s, q) => s + Number(q.points), 0)),
      isLate: win.late,
    });
    return { attemptId, resumed: false };
  });
}

// ─── Taking the quiz ─────────────────────────────────────────────────────────

/** Client-safe view of a question: no correctness flags, accepted answers or pairings. */
export type PublicQuestion = {
  id: string;
  type: QWithOptions["type"];
  prompt: string;
  points: number;
  imageFileId: string | null;
  options: { id: string; label: string }[];
  blanks: number;
  left: { id: string; label: string }[];
  right: { id: string; label: string }[];
};

function publicQuestion(q: QWithOptions, attemptId: string, optionOrder: string[] | undefined): PublicQuestion {
  const byId = new Map(q.options.map((o) => [o.id, o]));
  const options = (optionOrder ?? q.options.map((o) => o.id)).map((id) => byId.get(id)).filter(Boolean).map((o) => ({ id: o!.id, label: o!.label }));
  const pairs = (q.config as QuestionConfig).pairs ?? [];
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    points: Number(q.points),
    imageFileId: q.imageFileId,
    options,
    blanks: q.type === "fill_blank" ? countBlanks(q.prompt) : 0,
    left: pairs.map((p) => ({ id: p.id, label: p.left })),
    right: seededShuffle(
      pairs.map((p) => ({ id: matchToken(attemptId, p.id), label: p.right })),
      attemptId + q.id + "r",
    ),
  };
}

export async function attemptView(actor: Actor, attemptId: string) {
  requireStudent(actor);
  let att = await loadAttemptForStudent(actor.id, attemptId);
  if (att.status === "in_progress" && isExpired(att)) {
    await submitAttempt(actor, attemptId, undefined, { expired: true });
    att = await loadAttemptForStudent(actor.id, attemptId);
  }
  const asg = await assertStudentCanSee(actor.id, att.assignmentId);
  const qs = await questionsWithOptions(att.assignmentId);
  const byId = new Map(qs.map((q) => [q.id, q]));
  const responses = await db.select().from(schema.quizResponses).where(eq(schema.quizResponses.attemptId, attemptId));
  return {
    attempt: { id: att.id, status: att.status, attemptNo: att.attemptNo, startedAt: att.startedAt, expiresAt: att.expiresAt, serverNow: new Date() },
    assignment: { id: asg.id, title: asg.title, allowBackNavigation: asg.allowBackNavigation, showOverview: asg.showOverview, type: asg.type },
    questions: att.questionOrder.map((id) => byId.get(id)).filter(Boolean).map((q) => publicQuestion(q!, att.id, att.optionOrder[q!.id])),
    answers: Object.fromEntries(responses.map((r) => [r.questionId, r.answer])),
  };
}

const answerSchema = z.union([
  z.object({ optionId: z.string().uuid() }).strict(),
  z.object({ optionIds: z.array(z.string().uuid()).max(10) }).strict(),
  z.object({ text: z.string().max(5000) }).strict(),
  z.object({ blanks: z.array(z.string().max(200)).max(20) }).strict(),
  z.object({ matches: z.record(z.string().max(20), z.string().max(20)) }).strict(),
]);

function validateAnswerShape(q: QWithOptions, attemptId: string, raw: unknown) {
  const parsed = answerSchema.safeParse(raw);
  if (!parsed.success) throw invalid("Javob formati noto‘g‘ri.");
  const a = parsed.data as Record<string, unknown>;
  const optionIds = new Set(q.options.map((o) => o.id));
  const pairs = (q.config as QuestionConfig).pairs ?? [];
  const ok =
    ((q.type === "single_choice" || q.type === "true_false") && typeof a.optionId === "string" && optionIds.has(a.optionId)) ||
    (q.type === "multiple_choice" && Array.isArray(a.optionIds) && (a.optionIds as string[]).every((id) => optionIds.has(id))) ||
    ((q.type === "short_answer" || q.type === "essay") && typeof a.text === "string") ||
    (q.type === "fill_blank" && Array.isArray(a.blanks)) ||
    (q.type === "matching" &&
      !!a.matches &&
      Object.entries(a.matches as Record<string, string>).every(([l, r]) => pairs.some((p) => p.id === l) && pairs.some((p) => matchToken(attemptId, p.id) === r)));
  if (!ok) throw invalid("Javob bu savolga mos emas.");
  return parsed.data;
}

export async function saveAnswer(actor: Actor, attemptId: string, questionId: string, answer: unknown) {
  requireStudent(actor);
  const att = await loadAttemptForStudent(actor.id, attemptId);
  if (att.status !== "in_progress") throw new AppError("closed", "Urinish yakunlangan.");
  if (isExpired(att)) {
    await submitAttempt(actor, attemptId, undefined, { expired: true });
    throw new AppError("closed", "Vaqt tugadi. Javoblaringiz avtomatik topshirildi.");
  }
  if (!att.questionOrder.includes(questionId)) throw notFound("Savol topilmadi.");
  const q = (await questionsWithOptions(att.assignmentId)).find((x) => x.id === questionId);
  if (!q) throw notFound("Savol topilmadi.");
  const value = answer == null ? null : validateAnswerShape(q, attemptId, answer);
  await db
    .insert(schema.quizResponses)
    .values({ attemptId, questionId, answer: value })
    .onConflictDoUpdate({ target: [schema.quizResponses.attemptId, schema.quizResponses.questionId], set: { answer: value, updatedAt: new Date() } });
  return { savedAt: new Date() };
}

/** Translates matching tokens back to pair ids so the pure scorer can compare. */
function forScoring(q: QWithOptions, attemptId: string, answer: unknown) {
  if (q.type !== "matching" || !answer || typeof answer !== "object") return answer;
  const pairs = (q.config as QuestionConfig).pairs ?? [];
  const m = (answer as { matches?: Record<string, string> }).matches ?? {};
  const back = new Map(pairs.map((p) => [matchToken(attemptId, p.id), p.id]));
  return { matches: Object.fromEntries(Object.entries(m).map(([l, r]) => [l, back.get(r) ?? ""])) };
}

/**
 * Final submission. Idempotent: a second call (double click, retry after a network error, timer + button)
 * returns the already-recorded result instead of scoring twice.
 */
export async function submitAttempt(actor: Actor, attemptId: string, finalAnswers?: Record<string, unknown>, opts: { expired?: boolean } = {}) {
  requireStudent(actor);
  const settings = await getSettings();
  const out = await db.transaction(async (tx) => {
    const locked = (await tx.execute<{ id: string }>(sql`select id from quiz_attempts where id = ${attemptId} and student_id = ${actor.id} for update`))[0];
    if (!locked) throw notFound("Urinish topilmadi.");
    const att = await loadAttemptForStudent(actor.id, attemptId, tx);
    if (att.status !== "in_progress") return { attemptId, already: true, assignmentId: att.assignmentId, needsManual: att.needsManualGrading, percent: null as number | null, firstAttempt: false };
    const [asg] = await tx.select().from(schema.assignments).where(eq(schema.assignments.id, att.assignmentId));
    const qs = await questionsWithOptions(att.assignmentId, tx);

    // Answers sent with the submit call are accepted only while time remains (plus grace).
    if (finalAnswers && !opts.expired && !isExpired(att)) {
      for (const [qid, ans] of Object.entries(finalAnswers)) {
        const q = qs.find((x) => x.id === qid);
        if (!q || !att.questionOrder.includes(qid)) continue;
        let value: unknown = null;
        try {
          value = ans == null ? null : validateAnswerShape(q, attemptId, ans);
        } catch {
          continue;
        }
        await tx
          .insert(schema.quizResponses)
          .values({ attemptId, questionId: qid, answer: value })
          .onConflictDoUpdate({ target: [schema.quizResponses.attemptId, schema.quizResponses.questionId], set: { answer: value, updatedAt: new Date() } });
      }
    }
    const responses = await tx.select().from(schema.quizResponses).where(eq(schema.quizResponses.attemptId, attemptId));
    const byQ = new Map(responses.map((r) => [r.questionId, r]));
    let auto = 0;
    let needsManual = false;
    for (const qid of att.questionOrder) {
      const q = qs.find((x) => x.id === qid);
      if (!q) continue;
      const ans = byQ.get(qid)?.answer ?? null;
      const res = scoreQuestion(
        { id: q.id, type: q.type, points: Number(q.points), config: q.config as QuestionConfig, options: q.options },
        forScoring(q, attemptId, ans),
      );
      if (res.needsManual) needsManual = true;
      else auto += res.points ?? 0;
      await tx
        .insert(schema.quizResponses)
        .values({ attemptId, questionId: qid, answer: ans, isCorrect: res.isCorrect, pointsAwarded: res.points })
        .onConflictDoUpdate({
          target: [schema.quizResponses.attemptId, schema.quizResponses.questionId],
          set: { isCorrect: res.isCorrect, pointsAwarded: res.points },
        });
    }
    auto = round2(auto);
    const now = new Date();
    const submittedAt = opts.expired && att.expiresAt && att.expiresAt < now ? att.expiresAt : now;
    await tx
      .update(schema.quizAttempts)
      .set({
        status: needsManual ? "submitted" : "graded",
        submittedAt,
        autoScore: auto,
        score: needsManual ? null : auto,
        needsManualGrading: needsManual,
      })
      .where(eq(schema.quizAttempts.id, attemptId));
    if (!needsManual) await upsertQuizGrade(tx, asg, actor.id, actor.id);

    const firstAttempt = att.attemptNo === 1;
    const percent = percentOf(auto, Number(att.maxScore));
    if (settings.gamification.enabled && !needsManual) {
      await awardXp(actor.id, quizXp(settings.gamification.rules, percent, firstAttempt), "quiz", `quiz:${asg.id}:${actor.id}`, tx);
    }
    return { attemptId, already: false, assignmentId: asg.id, needsManual, percent, firstAttempt };
  });
  if (!out.already) {
    if (out.needsManual) {
      const teachers = await teachersFor(out.assignmentId, actor.id);
      await notify(teachers, { type: "submission", title: "Quiz javoblari tekshiruvni kutmoqda", link: `/teacher/grade/${out.assignmentId}/${actor.id}`, dedupeKey: `att:${attemptId}` });
    }
    await evaluateAchievements(actor.id);
  }
  return out;
}

/**
 * The official grade for a quiz is the best fully-scored attempt (minus any late penalty).
 * It stays provisional while attempts remain, and becomes final when none do.
 * Changes are written to grade_history — never silently.
 */
async function upsertQuizGrade(tx: Tx, asg: Assignment, studentId: string, changedBy: string) {
  if (!isGradedType(asg.type)) return;
  const attempts = await tx
    .select()
    .from(schema.quizAttempts)
    .where(and(eq(schema.quizAttempts.assignmentId, asg.id), eq(schema.quizAttempts.studentId, studentId)));
  const scored = attempts.filter((a) => a.status === "graded" && a.score != null);
  if (!scored.length) return;
  const settings = await getSettings();
  const best = scored
    .map((a) => {
      const max = Number(a.maxScore);
      const pen = latePenalty(Number(a.score), max, asg.latePenaltyPercent, a.isLate);
      return { a, max, pen, pts: round2(Number(a.score) - pen) };
    })
    .sort((x, y) => y.pts - x.pts)[0];
  const exhausted = attempts.length >= asg.maxAttempts && !attempts.some((a) => a.status !== "graded");
  const status: "provisional" | "final" = exhausted ? "final" : "provisional";
  const percent = percentOf(best.pts, best.max);
  const label = bandFor(percent, settings.grading.scale).label;
  const existing = (await tx.select().from(schema.grades).where(and(eq(schema.grades.assignmentId, asg.id), eq(schema.grades.studentId, studentId))))[0];
  if (existing?.status === "final") return; // never silently change a final grade
  const values = { points: best.pts, maxPoints: best.max, percent, scaleLabel: label, status, attemptId: best.a.id, latePenaltyApplied: best.pen, gradedBy: changedBy === studentId ? null : changedBy, gradedAt: new Date(), finalizedAt: status === "final" ? new Date() : null };
  if (!existing) {
    const [g] = await tx.insert(schema.grades).values({ assignmentId: asg.id, studentId, ...values }).returning({ id: schema.grades.id });
    await tx.insert(schema.gradeHistory).values({ gradeId: g.id, oldPoints: null, newPoints: best.pts, oldStatus: null, newStatus: status, reason: "Avtomatik baholash", changedBy });
  } else if (existing.points !== best.pts || existing.status !== status) {
    await tx.update(schema.grades).set(values).where(eq(schema.grades.id, existing.id));
    await tx.insert(schema.gradeHistory).values({ gradeId: existing.id, oldPoints: existing.points, newPoints: best.pts, oldStatus: existing.status, newStatus: status, reason: "Avtomatik baholash: yangi urinish", changedBy });
  }
}

// ─── Results & review ────────────────────────────────────────────────────────

export function reviewAllowed(asg: Pick<Assignment, "reviewMode" | "dueAt">, att: { status: string }, now = new Date()) {
  if (att.status === "in_progress") return false;
  switch (asg.reviewMode) {
    case "never":
      return false;
    case "after_submit":
      return true;
    case "after_due":
      return !asg.dueAt || now > asg.dueAt;
    case "after_grading":
      return att.status === "graded";
  }
}

export async function attemptResult(actor: Actor, attemptId: string) {
  requireStudent(actor);
  const att = await loadAttemptForStudent(actor.id, attemptId);
  if (att.status === "in_progress") throw new AppError("conflict", "Urinish hali yakunlanmagan.");
  const asg = await assertStudentCanSee(actor.id, att.assignmentId);
  const qs = await questionsWithOptions(att.assignmentId);
  const responses = await db.select().from(schema.quizResponses).where(eq(schema.quizResponses.attemptId, attemptId));
  const byQ = new Map(responses.map((r) => [r.questionId, r]));
  const review = reviewAllowed(asg, att);
  const reveal = review && asg.showCorrectAnswers;
  const items = att.questionOrder
    .map((id) => qs.find((q) => q.id === id))
    .filter(Boolean)
    .map((q) => {
      const r = byQ.get(q!.id);
      const pub = publicQuestion(q!, att.id, att.optionOrder[q!.id]);
      const pairs = (q!.config as QuestionConfig).pairs ?? [];
      return {
        question: pub,
        answer: review ? (r?.answer ?? null) : null,
        isCorrect: review ? (r?.isCorrect ?? null) : null,
        pointsAwarded: review ? (r?.pointsAwarded ?? null) : null,
        explanation: review ? q!.explanation : "",
        correct: reveal
          ? {
              optionIds: q!.options.filter((o) => o.isCorrect).map((o) => o.id),
              accepted: (q!.config as QuestionConfig).accepted ?? [],
              matches: Object.fromEntries(pairs.map((p) => [p.id, matchToken(att.id, p.id)])),
            }
          : null,
      };
    });
  const correctCount = responses.filter((r) => r.isCorrect === true).length;
  const answered = att.questionOrder.length;
  return {
    attempt: att,
    assignment: asg,
    review,
    reveal,
    items,
    score: att.score,
    maxScore: Number(att.maxScore),
    percent: att.score == null ? null : percentOf(Number(att.score), Number(att.maxScore)),
    passed: att.score == null ? null : percentOf(Number(att.score), Number(att.maxScore)) >= asg.passingPercent,
    correctCount: review ? correctCount : null,
    incorrectCount: review ? responses.filter((r) => r.isCorrect === false).length : null,
    total: answered,
  };
}

// ─── Manual grading of quiz answers (staff) ──────────────────────────────────

export async function attemptsForGrading(actor: Actor, assignmentId: string, studentId: string) {
  await assertCanGrade(actor, assignmentId, studentId);
  const attempts = await db
    .select()
    .from(schema.quizAttempts)
    .where(and(eq(schema.quizAttempts.assignmentId, assignmentId), eq(schema.quizAttempts.studentId, studentId)))
    .orderBy(asc(schema.quizAttempts.attemptNo));
  const qs = await questionsWithOptions(assignmentId);
  const out = [];
  for (const a of attempts) {
    const rs = await db.select().from(schema.quizResponses).where(eq(schema.quizResponses.attemptId, a.id));
    out.push({
      attempt: a,
      items: a.questionOrder.map((qid) => {
        const q = qs.find((x) => x.id === qid)!;
        return { question: q, response: rs.find((r) => r.questionId === qid) ?? null, matchToken: (pid: string) => matchToken(a.id, pid) };
      }),
    });
  }
  return out.map((o) => ({
    attempt: o.attempt,
    items: o.items.map((i) => ({
      question: i.question,
      response: i.response,
      matchTokens: Object.fromEntries(((i.question.config as QuestionConfig).pairs ?? []).map((p) => [matchToken(o.attempt.id, p.id), p.id])),
    })),
  }));
}

const manualInput = z.object({ points: z.record(z.string().uuid(), z.coerce.number().min(0)) });

export async function gradeAttemptManually(actor: Actor, attemptId: string, input: unknown) {
  const [att] = await db.select().from(schema.quizAttempts).where(eq(schema.quizAttempts.id, attemptId));
  if (!att) throw notFound();
  await assertCanGrade(actor, att.assignmentId, att.studentId);
  if (att.status === "in_progress") throw new AppError("conflict", "Urinish hali yakunlanmagan.");
  const v = manualInput.parse(input);
  const qs = await questionsWithOptions(att.assignmentId);
  await db.transaction(async (tx) => {
    await tx.execute(sql`select id from quiz_attempts where id = ${attemptId} for update`);
    for (const [qid, pts] of Object.entries(v.points)) {
      const q = qs.find((x) => x.id === qid);
      if (!q || !att.questionOrder.includes(qid)) throw invalid("Savol topilmadi.");
      if (pts > Number(q.points)) throw invalid(`Ball ${q.points} dan oshmasligi kerak.`);
      await tx
        .insert(schema.quizResponses)
        .values({ attemptId, questionId: qid, pointsAwarded: pts, isCorrect: pts >= Number(q.points), gradedBy: actor.id })
        .onConflictDoUpdate({
          target: [schema.quizResponses.attemptId, schema.quizResponses.questionId],
          set: { pointsAwarded: pts, isCorrect: pts >= Number(q.points), gradedBy: actor.id, updatedAt: new Date() },
        });
    }
    const rs = await tx.select().from(schema.quizResponses).where(eq(schema.quizResponses.attemptId, attemptId));
    const pending = att.questionOrder.some((qid) => rs.find((r) => r.questionId === qid)?.pointsAwarded == null);
    const total = round2(rs.reduce((s, r) => s + Number(r.pointsAwarded ?? 0), 0));
    await tx
      .update(schema.quizAttempts)
      .set({ status: pending ? "submitted" : "graded", needsManualGrading: pending, score: pending ? null : total, manualScore: round2(total - Number(att.autoScore ?? 0)) })
      .where(eq(schema.quizAttempts.id, attemptId));
    const [asg] = await tx.select().from(schema.assignments).where(eq(schema.assignments.id, att.assignmentId));
    if (!pending) await upsertQuizGrade(tx, asg, att.studentId, actor.id);
    await audit(actor.id, "quiz.manual_grade", "quiz_attempt", attemptId, { student: att.studentId }, tx);
  });
  const [after] = await db.select().from(schema.quizAttempts).where(eq(schema.quizAttempts.id, attemptId));
  if (after.status === "graded") {
    const [asg] = await db.select().from(schema.assignments).where(eq(schema.assignments.id, att.assignmentId));
    const settings = await getSettings();
    if (settings.gamification.enabled)
      await awardXp(att.studentId, quizXp(settings.gamification.rules, percentOf(Number(after.score), Number(after.maxScore)), att.attemptNo === 1), "quiz", `quiz:${asg.id}:${att.studentId}`);
    await notify([att.studentId], { type: "grade", title: `Quiz natijasi tayyor: ${asg.title}`, link: `/quizzes/${asg.id}/results/${attemptId}`, dedupeKey: `att-graded:${attemptId}` });
    await evaluateAchievements(att.studentId);
  }
}
