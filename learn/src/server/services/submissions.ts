import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import type { Actor } from "../auth/rbac";
import { AppError, forbidden, invalid } from "../errors";
import { isWorkType, submissionWindow } from "@/lib/assignment-kinds";
import { assertStudentCanSee } from "./access";
import { assertOwnFiles } from "./files";
import { awardXp, evaluateAchievements } from "./gamification";
import { notify, teachersFor } from "./notifications";
import { getSettings } from "./settings";

const workInput = z.object({
  content: z.string().max(50_000, "Javob juda uzun (50 000 belgigacha).").default(""),
  fileIds: z.array(z.string().uuid()).max(10, "Ko‘pi bilan 10 ta fayl.").default([]),
});

function requireStudent(actor: Actor) {
  if (actor.role !== "student") throw forbidden("Faqat o‘quvchilar topshira oladi.");
}

/** Whether the student may change their work right now, and why not. */
export function editability(
  asg: { allowResubmission: boolean; maxResubmissions: number; dueAt: Date | null; allowLate: boolean; lateCutoffAt: Date | null },
  sub: { status: string; version: number } | null,
  grade: { status: string } | null,
  now = new Date(),
): { canEdit: boolean; reason?: string; isResubmission: boolean } {
  const win = submissionWindow(asg, now);
  if (!win.open) return { canEdit: false, reason: "Topshirish muddati tugagan.", isResubmission: false };
  if (!sub || sub.status === "draft") return { canEdit: true, isResubmission: false };
  if (sub.status === "returned") return { canEdit: true, isResubmission: true };
  if (grade?.status === "final") return { canEdit: false, reason: "Ish yakuniy baholangan.", isResubmission: false };
  if (!asg.allowResubmission) return { canEdit: false, reason: "Bu vazifani qayta topshirib bo‘lmaydi.", isResubmission: false };
  if (sub.version - 1 >= asg.maxResubmissions) return { canEdit: false, reason: "Qayta topshirish imkoniyati tugagan.", isResubmission: false };
  return { canEdit: true, isResubmission: true };
}

export async function saveDraft(actor: Actor, assignmentId: string, input: unknown) {
  requireStudent(actor);
  const asg = await assertStudentCanSee(actor.id, assignmentId);
  if (!isWorkType(asg.type)) throw invalid("Bu vazifa turi uchun qoralama yo‘q.");
  const v = workInput.parse(input);
  await assertOwnFilesOrExisting(actor.id, assignmentId, v.fileIds);

  return db.transaction(async (tx) => {
    const existing = (await tx.execute<{ id: string; status: string; version: number }>(sql`
      select id, status, version from submissions where assignment_id = ${assignmentId} and student_id = ${actor.id} for update`))[0];
    const grade = (await tx.select().from(schema.grades).where(and(eq(schema.grades.assignmentId, assignmentId), eq(schema.grades.studentId, actor.id))))[0] ?? null;
    const ed = editability(asg, existing ?? null, grade);
    if (!ed.canEdit) throw new AppError("closed", ed.reason ?? "O‘zgartirib bo‘lmaydi.");
    // The submitted version is what teachers grade — it is never overwritten by a draft.
    if (existing?.status === "submitted" || existing?.status === "graded") throw new AppError("closed", "Ish topshirilgan. O‘zgartirish uchun «Qayta topshirish» tugmasidan foydalaning.");
    let id = existing?.id;
    if (!id) {
      const [row] = await tx.insert(schema.submissions).values({ assignmentId, studentId: actor.id, content: v.content }).returning({ id: schema.submissions.id });
      id = row.id;
    } else {
      await tx
        .update(schema.submissions)
        .set({ content: v.content, updatedAt: new Date() })
        .where(eq(schema.submissions.id, id));
    }
    await tx.delete(schema.submissionFiles).where(eq(schema.submissionFiles.submissionId, id));
    if (v.fileIds.length) await tx.insert(schema.submissionFiles).values(v.fileIds.map((fileId) => ({ submissionId: id!, fileId })));
    return { id, savedAt: new Date() };
  });
}

async function assertOwnFilesOrExisting(studentId: string, assignmentId: string, fileIds: string[]) {
  if (!fileIds.length) return;
  await assertOwnFiles(studentId, fileIds);
}

export async function submitWork(actor: Actor, assignmentId: string, input: unknown) {
  requireStudent(actor);
  const asg = await assertStudentCanSee(actor.id, assignmentId);
  if (!isWorkType(asg.type)) throw invalid("Bu vazifa quiz orqali bajariladi.");
  const v = workInput.parse(input);
  if (asg.type === "file_upload" && v.fileIds.length === 0) throw invalid("Kamida bitta fayl biriktiring.");
  if (asg.type === "written" && v.content.trim().length === 0 && v.fileIds.length === 0) throw invalid("Javob matnini yozing.");
  await assertOwnFilesOrExisting(actor.id, assignmentId, v.fileIds);
  const settings = await getSettings();

  const result = await db.transaction(async (tx) => {
    // Row lock serialises double-clicks and concurrent tabs.
    let existing = (await tx.execute<{ id: string; status: string; version: number }>(sql`
      select id, status, version from submissions where assignment_id = ${assignmentId} and student_id = ${actor.id} for update`))[0];
    if (!existing) {
      await tx.insert(schema.submissions).values({ assignmentId, studentId: actor.id }).onConflictDoNothing();
      existing = (await tx.execute<{ id: string; status: string; version: number }>(sql`
        select id, status, version from submissions where assignment_id = ${assignmentId} and student_id = ${actor.id} for update`))[0];
    }
    const grade = (await tx.select().from(schema.grades).where(and(eq(schema.grades.assignmentId, assignmentId), eq(schema.grades.studentId, actor.id))))[0] ?? null;
    const ed = editability(asg, existing.status === "draft" && existing.version === 0 ? null : existing, grade);
    if (!ed.canEdit) throw new AppError("closed", ed.reason ?? "Topshirib bo‘lmaydi.");

    const now = new Date();
    const late = submissionWindow(asg, now).late;
    const version = existing.version + 1;
    await tx
      .update(schema.submissions)
      .set({ status: "submitted", content: v.content, version, isLate: late, submittedAt: now, updatedAt: now })
      .where(eq(schema.submissions.id, existing.id));
    await tx.delete(schema.submissionFiles).where(eq(schema.submissionFiles.submissionId, existing.id));
    if (v.fileIds.length) await tx.insert(schema.submissionFiles).values(v.fileIds.map((fileId) => ({ submissionId: existing.id, fileId })));
    await tx.insert(schema.submissionVersions).values({ submissionId: existing.id, version, content: v.content, fileIds: v.fileIds, isLate: late, submittedAt: now });

    // XP only for the first submission of an assignment.
    if (settings.gamification.enabled) {
      const amount = late ? settings.gamification.rules.submitLate : settings.gamification.rules.submitOnTime;
      await awardXp(actor.id, amount, late ? "submit_late" : "submit_on_time", `submit:${assignmentId}:${actor.id}`, tx);
    }
    return { submissionId: existing.id, version, submittedAt: now, isLate: late };
  });

  const teachers = await teachersFor(assignmentId, actor.id);
  await notify(teachers, {
    type: "submission",
    title: `${actor.displayName ?? "O‘quvchi"} ishini topshirdi`,
    body: asg.title,
    link: `/teacher/grade/${assignmentId}/${actor.id}`,
    dedupeKey: `sub:${result.submissionId}:${result.version}`,
  });
  await evaluateAchievements(actor.id);
  return result;
}

/** Reading/learning materials: a single "mark as read" that counts as completion. */
export async function markMaterialRead(actor: Actor, assignmentId: string) {
  requireStudent(actor);
  const asg = await assertStudentCanSee(actor.id, assignmentId);
  if (asg.type !== "material") throw invalid("Bu o‘quv materiali emas.");
  const settings = await getSettings();
  await db.transaction(async (tx) => {
    const existing = (await tx.execute<{ id: string; version: number }>(sql`
      select id, version from submissions where assignment_id = ${assignmentId} and student_id = ${actor.id} for update`))[0];
    if (existing && existing.version > 0) return;
    const now = new Date();
    let id = existing?.id;
    if (!id) {
      const [row] = await tx.insert(schema.submissions).values({ assignmentId, studentId: actor.id, status: "submitted", version: 1, submittedAt: now }).returning({ id: schema.submissions.id });
      id = row.id;
    } else await tx.update(schema.submissions).set({ status: "submitted", version: 1, submittedAt: now }).where(eq(schema.submissions.id, id));
    await tx.insert(schema.submissionVersions).values({ submissionId: id, version: 1, content: "", fileIds: [], isLate: false, submittedAt: now });
    if (settings.gamification.enabled) await awardXp(actor.id, settings.gamification.rules.materialRead, "material_read", `material:${assignmentId}:${actor.id}`, tx);
  });
  await evaluateAchievements(actor.id);
}
