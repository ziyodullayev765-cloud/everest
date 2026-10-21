import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { can, isAdmin, type Actor } from "../auth/rbac";
import { AppError, forbidden, invalid } from "../errors";
import { questionInput } from "@/lib/validation/assignment";
import { insertQuestions } from "./assignments";
import { assertCanManageAssignment } from "./access";
import { audit } from "./audit";

/** Bank questions are shared by staff of the same subject; only the owner (or an admin) deletes them. */
export async function listBank(actor: Actor, subjectId?: string) {
  if (!can(actor, "assignments.create")) throw forbidden();
  const qs = await db
    .select({ q: schema.questions, subject: schema.subjects.name, owner: schema.users.displayName })
    .from(schema.questions)
    .innerJoin(schema.subjects, eq(schema.subjects.id, schema.questions.bankSubjectId))
    .innerJoin(schema.users, eq(schema.users.id, schema.questions.ownerId))
    .where(and(isNull(schema.questions.assignmentId), subjectId ? eq(schema.questions.bankSubjectId, subjectId) : sql`true`))
    .orderBy(desc(schema.questions.createdAt))
    .limit(500);
  const opts = qs.length
    ? await db.select().from(schema.questionOptions).where(inArray(schema.questionOptions.questionId, qs.map((x) => x.q.id))).orderBy(asc(schema.questionOptions.position))
    : [];
  return qs.map((x) => ({ ...x.q, subjectName: x.subject, ownerName: x.owner, options: opts.filter((o) => o.questionId === x.q.id) }));
}

export async function addToBank(actor: Actor, subjectId: string, input: unknown) {
  if (!can(actor, "assignments.create")) throw forbidden();
  const q = questionInput.parse(input);
  await db.transaction(async (tx) => {
    await insertQuestions(tx, actor.id, [q], { bankSubjectId: subjectId });
    await audit(actor.id, "bank.add", "question", null, { subjectId }, tx);
  });
}

export async function deleteFromBank(actor: Actor, questionId: string) {
  const [q] = await db.select().from(schema.questions).where(and(eq(schema.questions.id, questionId), isNull(schema.questions.assignmentId)));
  if (!q) return;
  if (q.ownerId !== actor.id && !isAdmin(actor)) throw forbidden();
  await db.delete(schema.questions).where(eq(schema.questions.id, questionId));
}

/** Copies bank questions into a quiz (the bank entry stays untouched). */
export async function copyFromBank(actor: Actor, assignmentId: string, questionIds: string[]) {
  await assertCanManageAssignment(actor, assignmentId);
  if (!questionIds.length) throw invalid("Savol tanlanmagan.");
  const attempts = await db.select({ n: sql<number>`count(*)::int` }).from(schema.quizAttempts).where(eq(schema.quizAttempts.assignmentId, assignmentId));
  if ((attempts[0]?.n ?? 0) > 0) throw new AppError("closed", "Quiz boshlangan — savol qo‘shib bo‘lmaydi.");
  await db.transaction(async (tx) => {
    const src = await tx.select().from(schema.questions).where(and(inArray(schema.questions.id, questionIds), isNull(schema.questions.assignmentId)));
    const max = await tx.select({ p: sql<number>`coalesce(max(position), -1)::int` }).from(schema.questions).where(eq(schema.questions.assignmentId, assignmentId));
    let pos = (max[0]?.p ?? -1) + 1;
    for (const q of src) {
      const [nq] = await tx
        .insert(schema.questions)
        .values({ assignmentId, ownerId: actor.id, position: pos++, type: q.type, prompt: q.prompt, points: q.points, explanation: q.explanation, imageFileId: q.imageFileId, config: q.config })
        .returning({ id: schema.questions.id });
      const opts = await tx.select().from(schema.questionOptions).where(eq(schema.questionOptions.questionId, q.id));
      if (opts.length) await tx.insert(schema.questionOptions).values(opts.map((o) => ({ questionId: nq.id, position: o.position, label: o.label, isCorrect: o.isCorrect })));
    }
    const total = await tx.select({ s: sql<number>`coalesce(sum(points),0)::float` }).from(schema.questions).where(eq(schema.questions.assignmentId, assignmentId));
    await tx.update(schema.assignments).set({ maxScore: Math.max(1, total[0]?.s ?? 1) }).where(eq(schema.assignments.id, assignmentId));
  });
}
