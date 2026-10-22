import { afterAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { closeDb, db, schema } from "@/server/db";
import { saveAssignment, listForStudent, getForStudent, saveQuestions, setAssignmentStatus, duplicateAssignment, listForStaff, promoteScheduled } from "@/server/services/assignments";
import { saveDraft, submitWork } from "@/server/services/submissions";
import { gradeSubmission, returnForRevision, gradingContext, studentGrades, gradebook, submissionQueue } from "@/server/services/grades";
import { startAttempt, saveAnswer, submitAttempt, attemptView, attemptResult, quizOverview, gradeAttemptManually } from "@/server/services/quiz";
import { studentDashboard, studentResults } from "@/server/services/analytics";
import { listNotifications } from "@/server/services/notifications";
import { authorizeFileRead } from "@/server/services/files";
import { baseAssignment, world } from "./fixtures";
import { localDay } from "@/lib/dates";
import { addDays } from "@/lib/gamification";

/** XP from the task rules only (achievement rewards are tested separately). */
const taskXp = async (userId: string) =>
  (await db.execute<{ n: number }>(sql`select coalesce(sum(amount),0)::int as n from xp_transactions where user_id = ${userId} and reason <> 'achievement'`))[0].n;

afterAll(async () => closeDb());

const err = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as { code?: string; message: string };
  }
  throw new Error("expected rejection");
};

describe("assignment → submission → grading", () => {
  it("full written-work lifecycle with role checks", async () => {
    const w = await world();

    // Teacher publishes to their own class only.
    const { id } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id]));
    expect((await err(saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.other.id])))).code).toBe("forbidden");
    // A student can never create assignments.
    expect((await err(saveAssignment(w.student, null, baseAssignment(w.subject.id, [w.cls.id])))).code).toBe("forbidden");

    // Visible to the targeted student, invisible to the other one.
    expect((await listForStudent(w.student.id)).map((a) => a.id)).toContain(id);
    expect((await listForStudent(w.otherStudent.id)).map((a) => a.id)).not.toContain(id);
    expect((await err(getForStudent(w.otherStudent.id, id))).code).toBe("not_found");
    expect((await listNotifications(w.student.id)).some((n) => n.link === `/assignments/${id}`)).toBe(true);

    // Draft, then submit.
    await saveDraft(w.student, id, { content: "Qoralama" });
    expect((await listForStudent(w.student.id)).find((a) => a.id === id)?.status).toBe("in_progress");
    const sub = await submitWork(w.student, id, { content: "Javoblar: 1) 3/4 ..." });
    expect(sub.version).toBe(1);
    expect(sub.isLate).toBe(false);
    expect((await listForStudent(w.student.id)).find((a) => a.id === id)?.status).toBe("submitted");

    // No modification after submission (resubmission not allowed).
    expect((await err(submitWork(w.student, id, { content: "o‘zgartirdim" }))).code).toBe("closed");
    expect((await err(saveDraft(w.student, id, { content: "o‘zgartirdim" }))).code).toBe("closed");
    // XP awarded exactly once.
    expect(await taskXp(w.student.id)).toBe(20);

    // Other teacher cannot grade; other student cannot be graded on it.
    expect((await err(gradeSubmission(w.outsiderTeacher, id, w.student.id, { points: 9 }))).code).toBe("forbidden");
    expect((await err(gradingContext(w.teacher, id, w.otherStudent.id))).code).toBe("forbidden");

    // Provisional grade, then final.
    await gradeSubmission(w.teacher, id, w.student.id, { points: 7, feedback: "Yaxshi, 4-misolni qayta ko‘ring" });
    expect((await listForStudent(w.student.id)).find((a) => a.id === id)?.status).toBe("reviewing");
    const fin = await gradeSubmission(w.teacher, id, w.student.id, { points: 9, finalize: true });
    expect(fin).toMatchObject({ status: "final", points: 9, percent: 90, label: "5" });
    const row = (await listForStudent(w.student.id)).find((a) => a.id === id)!;
    expect(row.status).toBe("graded");
    expect(row.gradePoints).toBe(9);

    const detail = await getForStudent(w.student.id, id);
    expect(detail.feedback[0].body).toContain("4-misol");
    expect(detail.grade?.status).toBe("final");

    // Changing a final grade: needs permission AND a reason, and is audited.
    expect((await err(gradeSubmission(w.teacher, id, w.student.id, { points: 10, reason: "qayta ko‘rildi" }))).code).toBe("forbidden");
    expect((await err(gradeSubmission(w.admin, id, w.student.id, { points: 10 }))).code).toBe("invalid");
    await gradeSubmission(w.admin, id, w.student.id, { points: 10, reason: "Apellyatsiya natijasi" });
    const ctx = await gradingContext(w.admin, id, w.student.id);
    expect(ctx.grade?.points).toBe(10);
    expect(ctx.history.map((h) => h.reason)).toContain("Apellyatsiya natijasi");
    expect(ctx.history.length).toBe(3);

    // The DB itself refuses a silent change to a finalized grade.
    await expect(db.update(schema.grades).set({ points: 1 }).where(eq(schema.grades.id, ctx.grade!.id))).rejects.toThrow();
    await expect(db.delete(schema.gradeHistory)).rejects.toThrow();

    const grades = await studentGrades(w.student.id);
    expect(grades[0]).toMatchObject({ points: 10, status: "final" });
    expect(await studentGrades(w.otherStudent.id)).toEqual([]);
  });

  it("returns work for revision and allows a resubmission", async () => {
    const w = await world();
    const { id } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id]));
    await submitWork(w.student, id, { content: "v1" });
    await returnForRevision(w.teacher, id, w.student.id, "Iltimos, yechimni to‘liq yozing");
    expect((await listForStudent(w.student.id)).find((a) => a.id === id)?.status).toBe("returned");
    const s2 = await submitWork(w.student, id, { content: "v2 to‘liq" });
    expect(s2.version).toBe(2);
    const ctx = await gradingContext(w.teacher, id, w.student.id);
    expect(ctx.versions.map((v) => v.content)).toEqual(["v2 to‘liq", "v1"]);
    expect(await taskXp(w.student.id)).toBe(20); // no XP for the resubmission
  });

  it("late rules: closed without allowLate, penalty with it", async () => {
    const w = await world();
    const past = new Date(Date.now() - 2 * 3600_000 + 5 * 3600_000).toISOString().slice(0, 16);
    const closed = await saveAssignment(w.admin, null, baseAssignment(w.subject.id, [w.cls.id], { dueAt: past, allowLate: false }));
    expect((await err(submitWork(w.student, closed.id, { content: "kech" }))).code).toBe("closed");
    expect((await listForStudent(w.student.id)).find((a) => a.id === closed.id)?.status).toBe("overdue");

    const open = await saveAssignment(w.admin, null, baseAssignment(w.subject.id, [w.cls.id], { dueAt: past, allowLate: true, latePenaltyPercent: 20 }));
    const s = await submitWork(w.student, open.id, { content: "kech" });
    expect(s.isLate).toBe(true);
    const g = await gradeSubmission(w.teacher, open.id, w.student.id, { points: 10, finalize: true });
    expect(g.points).toBe(8);
    expect(await taskXp(w.student.id)).toBe(10);
  });

  it("rubric grading sums criteria and validates limits", async () => {
    const w = await world();
    const rubric = [{ id: "c1", title: "To‘g‘rilik", maxPoints: 6 }, { id: "c2", title: "Tushuntirish", maxPoints: 4 }];
    const { id } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { rubric }));
    await submitWork(w.student, id, { content: "javob" });
    expect((await err(gradeSubmission(w.teacher, id, w.student.id, { rubricScores: { c1: 7, c2: 1 } }))).code).toBe("invalid");
    const g = await gradeSubmission(w.teacher, id, w.student.id, { rubricScores: { c1: 5, c2: 3.5 }, finalize: true });
    expect(g.points).toBe(8.5);
  });

  it("drafts, scheduling, archive and duplicate", async () => {
    const w = await world();
    const draft = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { publishMode: "draft" }));
    expect((await listForStudent(w.student.id)).map((a) => a.id)).not.toContain(draft.id);
    const soon = new Date(Date.now() + 5 * 3600_000 + 120_000).toISOString().slice(0, 16);
    const sch = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { publishMode: "schedule", publishAt: soon }));
    expect((await listForStudent(w.student.id)).map((a) => a.id)).not.toContain(sch.id);
    await db.update(schema.assignments).set({ publishAt: new Date(Date.now() - 1000) }).where(eq(schema.assignments.id, sch.id));
    await promoteScheduled(true);
    expect((await listForStudent(w.student.id)).map((a) => a.id)).toContain(sch.id);
    const [promoted] = await db.select().from(schema.assignments).where(eq(schema.assignments.id, sch.id));
    expect(promoted.status).toBe("published");

    await setAssignmentStatus(w.teacher, sch.id, "archive");
    expect((await listForStudent(w.student.id)).map((a) => a.id)).not.toContain(sch.id);
    const copy = await duplicateAssignment(w.teacher, sch.id);
    const staff = await listForStaff(w.teacher, { status: "draft" });
    expect(staff.map((a) => a.id)).toContain(copy);
    // Outsider teacher sees neither.
    expect((await listForStaff(w.outsiderTeacher)).map((a) => a.id)).not.toContain(draft.id);
  });
});

describe("quiz engine", () => {
  const questions = [
    { type: "single_choice", prompt: "2 + 2 = ?", points: 2, options: [{ label: "3", isCorrect: false }, { label: "4", isCorrect: true }] },
    { type: "true_false", prompt: "Yer dumaloq", points: 1, options: [{ label: "To‘g‘ri", isCorrect: true }, { label: "Noto‘g‘ri", isCorrect: false }] },
    { type: "short_answer", prompt: "Poytaxt?", points: 1, accepted: [["Toshkent"]] },
    { type: "fill_blank", prompt: "3 × ___ = 12", points: 2, accepted: [["4"]] },
    { type: "matching", prompt: "Moslang", points: 2, pairs: [{ left: "H₂O", right: "Suv" }, { left: "NaCl", right: "Tuz" }] },
  ];

  it("scores automatically, hides answers before submission, is idempotent", async () => {
    const w = await world();
    const { id } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { type: "multiple_choice", publishMode: "draft", shuffleQuestions: true, shuffleOptions: true }));
    await saveQuestions(w.teacher, id, questions);
    await setAssignmentStatus(w.teacher, id, "publish");

    const ov = await quizOverview(w.student, id);
    expect(ov.questionCount).toBe(5);
    expect(ov.totalPoints).toBe(8);
    const { attemptId } = await startAttempt(w.student, id);
    // Resuming returns the same attempt (interrupted sessions).
    expect((await startAttempt(w.student, id)).attemptId).toBe(attemptId);

    const view = await attemptView(w.student, attemptId);
    const json = JSON.stringify(view);
    expect(json).not.toContain("isCorrect");
    expect(json).not.toContain("Toshkent");
    expect(json).not.toContain("accepted");
    const byPrompt = (p: string) => view.questions.find((q) => q.prompt === p)!;
    const sc = byPrompt("2 + 2 = ?");
    const tf = byPrompt("Yer dumaloq");
    const m = byPrompt("Moslang");
    // Matching right-hand tokens don't equal left ids.
    expect(m.right.map((r) => r.id).some((t) => m.left.some((l) => l.id === t))).toBe(false);

    await saveAnswer(w.student, attemptId, sc.id, { optionId: sc.options.find((o) => o.label === "4")!.id });
    await saveAnswer(w.student, attemptId, tf.id, { optionId: tf.options.find((o) => o.label === "Noto‘g‘ri")!.id });
    // Another student can't touch this attempt.
    expect((await err(saveAnswer(w.otherStudent, attemptId, sc.id, { optionId: sc.options[0].id }))).code).toBe("not_found");
    // Option from another question is rejected.
    expect((await err(saveAnswer(w.student, attemptId, sc.id, { optionId: tf.options[0].id }))).code).toBe("invalid");

    const suv = m.right.find((r) => r.label === "Suv")!.id;
    const tuz = m.right.find((r) => r.label === "Tuz")!.id;
    const h2o = m.left.find((l) => l.label === "H₂O")!.id;
    const nacl = m.left.find((l) => l.label === "NaCl")!.id;
    const res = await submitAttempt(w.student, attemptId, {
      [byPrompt("Poytaxt?").id]: { text: " toshkent " },
      [byPrompt("3 × ___ = 12").id]: { blanks: ["4"] },
      [m.id]: { matches: { [h2o]: suv, [nacl]: tuz } },
    });
    expect(res.needsManual).toBe(false);
    expect(res.percent).toBe(87.5); // 7 / 8
    // Duplicate submission is a no-op.
    expect((await submitAttempt(w.student, attemptId)).already).toBe(true);
    expect((await err(saveAnswer(w.student, attemptId, sc.id, null))).code).toBe("closed");

    const result = await attemptResult(w.student, attemptId);
    expect(result.score).toBe(7);
    expect(result.correctCount).toBe(4);
    expect(result.incorrectCount).toBe(1);
    expect(result.reveal).toBe(true);

    const grades = await studentGrades(w.student.id);
    expect(grades[0]).toMatchObject({ points: 7, status: "final", label: "5" });
    // XP once: 10 + 8 (87.5% → 8 tens) = 18
    expect(await taskXp(w.student.id)).toBe(18);
    expect((await err(startAttempt(w.student, id))).code).toBe("closed"); // 1 attempt only
  });

  it("review settings: never reveals answers", async () => {
    const w = await world();
    const { id } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { type: "true_false", publishMode: "draft", reviewMode: "never" }));
    await saveQuestions(w.teacher, id, [questions[1]]);
    await setAssignmentStatus(w.teacher, id, "publish");
    const { attemptId } = await startAttempt(w.student, id);
    await submitAttempt(w.student, attemptId);
    const r = await attemptResult(w.student, attemptId);
    expect(r.review).toBe(false);
    expect(r.items.every((i) => i.correct === null && i.isCorrect === null && i.explanation === "")).toBe(true);
  });

  it("essay needs manual grading; teacher grades it", async () => {
    const w = await world();
    const { id } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { type: "short_answer", publishMode: "draft" }));
    await saveQuestions(w.teacher, id, [questions[0], { type: "essay", prompt: "Fikringizni yozing", points: 5 }]);
    await setAssignmentStatus(w.teacher, id, "publish");
    const { attemptId } = await startAttempt(w.student, id);
    const v = await attemptView(w.student, attemptId);
    const essay = v.questions.find((q) => q.type === "essay")!;
    await saveAnswer(w.student, attemptId, essay.id, { text: "Mening fikrim…" });
    const r = await submitAttempt(w.student, attemptId);
    expect(r.needsManual).toBe(true);
    expect((await listForStudent(w.student.id)).find((a) => a.id === id)?.status).toBe("reviewing");
    expect((await submissionQueue(w.teacher, { status: "pending" })).some((s) => s.assignmentId === id)).toBe(true);
    expect((await err(gradeAttemptManually(w.teacher, attemptId, { points: { [essay.id]: 6 } }))).code).toBe("invalid");
    expect((await err(gradeAttemptManually(w.outsiderTeacher, attemptId, { points: { [essay.id]: 4 } }))).code).toBe("forbidden");
    await gradeAttemptManually(w.teacher, attemptId, { points: { [essay.id]: 4 } });
    const g = (await studentGrades(w.student.id))[0];
    expect(g.points).toBe(4); // 0 (wrong/unanswered MC) + 4
    expect((await listForStudent(w.student.id)).find((a) => a.id === id)?.status).toBe("graded");
  });

  it("timer expiry auto-submits saved answers", async () => {
    const w = await world();
    const { id } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { type: "timed_quiz", publishMode: "draft", timeLimitMinutes: 5 }));
    await saveQuestions(w.teacher, id, [questions[0]]);
    await setAssignmentStatus(w.teacher, id, "publish");
    const { attemptId } = await startAttempt(w.student, id);
    const v = await attemptView(w.student, attemptId);
    await saveAnswer(w.student, attemptId, v.questions[0].id, { optionId: v.questions[0].options.find((o) => o.label === "4")!.id });
    await db.update(schema.quizAttempts).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(schema.quizAttempts.id, attemptId));
    expect((await err(saveAnswer(w.student, attemptId, v.questions[0].id, null))).code).toBe("closed");
    const [att] = await db.select().from(schema.quizAttempts).where(eq(schema.quizAttempts.id, attemptId));
    expect(att.status).toBe("graded");
    expect(att.score).toBe(2);
  });

  it("multiple attempts keep the best score as a provisional grade until the last attempt", async () => {
    const w = await world();
    const { id } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { type: "multiple_choice", publishMode: "draft", maxAttempts: 2 }));
    await saveQuestions(w.teacher, id, [questions[0]]);
    await setAssignmentStatus(w.teacher, id, "publish");
    const a1 = await startAttempt(w.student, id);
    await submitAttempt(w.student, a1.attemptId);
    let g = (await studentGrades(w.student.id))[0];
    expect(g).toMatchObject({ points: 0, status: "provisional" });
    const a2 = await startAttempt(w.student, id);
    const v = await attemptView(w.student, a2.attemptId);
    await submitAttempt(w.student, a2.attemptId, { [v.questions[0].id]: { optionId: v.questions[0].options.find((o) => o.label === "4")!.id } });
    g = (await studentGrades(w.student.id))[0];
    expect(g).toMatchObject({ points: 2, status: "final" });
    // XP is from the first attempt only (0% → 10 XP).
    expect(await taskXp(w.student.id)).toBe(10);
    // Questions are locked once attempts exist.
    expect((await err(saveQuestions(w.teacher, id, [questions[1]]))).code).toBe("closed");
  });
});

describe("analytics reflect real records", () => {
  it("new student has an empty week; activity shows up after work", async () => {
    const w = await world();
    const empty = await studentDashboard(w.student.id, 5);
    expect(empty.hasAnyActivity).toBe(false);
    expect(empty.week).toHaveLength(7);
    expect(empty.week.every((d) => d.tasks === 0 && d.quizzes === 0)).toBe(true);
    expect(empty.stats.averageGrade).toBeNull();

    const { id } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id]));
    await submitWork(w.student, id, { content: "x" });
    await gradeSubmission(w.teacher, id, w.student.id, { points: 6, finalize: true });
    const d = await studentDashboard(w.student.id, 5);
    expect(d.stats.completed).toBe(1);
    expect(d.stats.averageGrade).toBe(60);
    expect(d.stats.streak).toBe(1);
    expect(d.week[6].tasks).toBe(1);
    expect(d.stats.weeklyProgress).toBe(20);

    const today = localDay(new Date());
    const r = await studentResults(w.student.id, { from: addDays(today, -29), to: today });
    expect(r.areas[0]).toMatchObject({ official: 60, officialCount: 1 });
    expect(r.needsPractice).toHaveLength(0);
    expect(r.punctuality.onTime).toBe(1);
    expect(r.compare.thisWeek.tasks).toBe(1);

    // Gradebook: teacher sees own class, not others.
    const gb = await gradebook(w.teacher, w.cls.id);
    expect(gb.rows[0].cells[0]?.points).toBe(6);
    await expect(gradebook(w.teacher, w.other.id)).rejects.toThrow();
  });
});

describe("file access", () => {
  it("submission files are private to the student and their teachers", async () => {
    const w = await world();
    const { storeFile } = await import("@/server/services/files");
    const pdf = new File([Buffer.from("%PDF-1.4\n%test\n")], "ish.pdf", { type: "application/pdf" });
    const f = await storeFile(w.student, pdf);
    const { id } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id], { type: "file_upload" }));
    await submitWork(w.student, id, { fileIds: [f.id] });
    await expect(authorizeFileRead(w.student, f.id)).resolves.toBeTruthy();
    await expect(authorizeFileRead(w.teacher, f.id)).resolves.toBeTruthy();
    await expect(authorizeFileRead(w.otherStudent, f.id)).rejects.toThrow();
    await expect(authorizeFileRead(w.outsiderTeacher, f.id)).rejects.toThrow();
    await expect(authorizeFileRead(null, f.id)).rejects.toThrow();
    // Can't attach another student's file.
    const { id: id2 } = await saveAssignment(w.admin, null, baseAssignment(w.subject.id, [w.other.id], { type: "file_upload" }));
    expect((await err(submitWork(w.otherStudent, id2, { fileIds: [f.id] }))).code).toBe("invalid");
    // Disguised file types are rejected.
    const fake = new File([Buffer.from("<script>alert(1)</script>")], "x.pdf", { type: "application/pdf" });
    expect((await err(storeFile(w.student, fake))).code).toBe("invalid");
    const rows = await db.select().from(schema.submissionFiles).where(and(eq(schema.submissionFiles.fileId, f.id)));
    expect(rows).toHaveLength(1);
  });
});
