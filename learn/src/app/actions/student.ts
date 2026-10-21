"use server";
import { revalidatePath } from "next/cache";
import { run, type ActionResult } from "@/server/action";
import { requireUser } from "@/server/auth/session";
import { markMaterialRead, saveDraft, submitWork } from "@/server/services/submissions";
import { saveAnswer, startAttempt, submitAttempt } from "@/server/services/quiz";
import { markRead } from "@/server/services/notifications";
import { updateOwnProfile } from "@/server/services/users";
import { joinByCode } from "@/server/services/classes";

export async function saveDraftAction(assignmentId: string, input: { content: string; fileIds: string[]; itemProgress?: Record<string, { done: boolean; text?: string }> }) {
  return run(async () => {
    const u = await requireUser();
    const r = await saveDraft(u, assignmentId, input);
    return { savedAt: r.savedAt.toISOString() };
  });
}

export async function submitWorkAction(assignmentId: string, input: { content: string; fileIds: string[]; itemProgress?: Record<string, { done: boolean; text?: string }> }) {
  return run(async () => {
    const u = await requireUser();
    const r = await submitWork(u, assignmentId, input);
    revalidatePath("/", "layout");
    return { submittedAt: r.submittedAt.toISOString(), version: r.version, isLate: r.isLate };
  });
}

export async function markReadAction(assignmentId: string) {
  return run(async () => {
    const u = await requireUser();
    await markMaterialRead(u, assignmentId);
    revalidatePath("/", "layout");
  });
}

export async function startQuizAction(assignmentId: string): Promise<ActionResult<{ attemptId: string }>> {
  return run(async () => {
    const u = await requireUser();
    const r = await startAttempt(u, assignmentId);
    return { attemptId: r.attemptId };
  });
}

export async function saveAnswerAction(attemptId: string, questionId: string, answer: unknown) {
  return run(async () => {
    const u = await requireUser();
    const r = await saveAnswer(u, attemptId, questionId, answer);
    return { savedAt: r.savedAt.toISOString() };
  });
}

export async function submitQuizAction(attemptId: string, answers: Record<string, unknown>) {
  return run(async () => {
    const u = await requireUser();
    const r = await submitAttempt(u, attemptId, answers);
    revalidatePath("/", "layout");
    return { attemptId: r.attemptId, assignmentId: r.assignmentId };
  });
}

export async function markNotificationsReadAction(id?: string) {
  return run(async () => {
    const u = await requireUser();
    await markRead(u.id, id);
    revalidatePath("/", "layout");
  });
}

export async function updateProfileAction(input: Record<string, unknown>) {
  return run(async () => {
    const u = await requireUser();
    await updateOwnProfile(u, input);
    revalidatePath("/", "layout");
  });
}

export async function joinClassAction(code: string) {
  return run(async () => {
    const u = await requireUser();
    const c = await joinByCode(u, code);
    revalidatePath("/", "layout");
    return { name: c.name };
  });
}
