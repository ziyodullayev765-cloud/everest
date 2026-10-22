"use server";
import { revalidatePath } from "next/cache";
import { run, type ActionResult } from "@/server/action";
import { getCurrentUser, requireRole, requireUser } from "@/server/auth/session";
import { markAchievementsSeen, unseenAchievements } from "@/server/services/achievements";
import { getSettings } from "@/server/services/settings";
import { markMaterialRead, saveDraft, submitWork } from "@/server/services/submissions";
import { saveAnswer, startAttempt, submitAttempt } from "@/server/services/quiz";
import { markRead } from "@/server/services/notifications";
import { setOwnLocale, updateOwnProfile } from "@/server/services/users";
import { setLocaleCookie } from "@/server/locale";
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

export async function unseenAchievementsAction() {
  return run(async () => {
    const u = await requireRole("student");
    const settings = await getSettings();
    if (!settings.gamification.enabled || !u.gamificationEnabled) return [];
    return (await unseenAchievements(u.id)).map((a) => ({ ...a, earnedAt: a.earnedAt.toISOString() }));
  });
}

export async function markAchievementsSeenAction(codes: string[]) {
  return run(async () => {
    const u = await requireRole("student");
    await markAchievementsSeen(u.id, codes.filter((c) => typeof c === "string").slice(0, 20));
  });
}

/** Switches the interface language; signed-out visitors (login page) only get the device cookie. */
export async function setLocaleAction(locale: "uz" | "en") {
  return run(async () => {
    const u = await getCurrentUser();
    if (u) await setOwnLocale(u, locale);
    else await setLocaleCookie(locale === "en" ? "en" : "uz");
  });
}
