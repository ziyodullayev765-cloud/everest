"use server";
import { revalidatePath } from "next/cache";
import { run } from "@/server/action";
import { requireRole } from "@/server/auth/session";
import { duplicateAssignment, saveAssignment, saveQuestions, setAssignmentStatus } from "@/server/services/assignments";
import { addFeedback, finalizeGrade, gradeSubmission, returnForRevision } from "@/server/services/grades";
import { gradeAttemptManually } from "@/server/services/quiz";
import { addToBank, copyFromBank, deleteFromBank } from "@/server/services/bank";
import { createChallenge, postAnnouncement } from "@/server/services/classes";

const staff = () => requireRole("teacher", "admin", "super_admin");
const refresh = () => revalidatePath("/", "layout");

export async function saveAssignmentAction(id: string | null, input: unknown) {
  return run(async () => {
    const r = await saveAssignment(await staff(), id, input);
    refresh();
    return r;
  });
}

export async function saveQuestionsAction(id: string, input: unknown) {
  return run(async () => {
    await saveQuestions(await staff(), id, input);
    refresh();
  });
}

export async function assignmentStatusAction(id: string, action: "publish" | "archive" | "restore" | "unpublish") {
  return run(async () => {
    await setAssignmentStatus(await staff(), id, action);
    refresh();
  });
}

export async function duplicateAssignmentAction(id: string) {
  return run(async () => {
    const copy = await duplicateAssignment(await staff(), id);
    refresh();
    return { id: copy };
  });
}

export async function gradeAction(assignmentId: string, studentId: string, input: unknown) {
  return run(async () => {
    const r = await gradeSubmission(await staff(), assignmentId, studentId, input);
    refresh();
    return r;
  });
}

export async function returnAction(assignmentId: string, studentId: string, message: string) {
  return run(async () => {
    await returnForRevision(await staff(), assignmentId, studentId, message);
    refresh();
  });
}

export async function feedbackAction(assignmentId: string, studentId: string, body: string) {
  return run(async () => {
    await addFeedback(await staff(), assignmentId, studentId, body);
    refresh();
  });
}

export async function finalizeAction(gradeId: string) {
  return run(async () => {
    await finalizeGrade(await staff(), gradeId);
    refresh();
  });
}

export async function gradeAttemptAction(attemptId: string, points: Record<string, number>) {
  return run(async () => {
    await gradeAttemptManually(await staff(), attemptId, { points });
    refresh();
  });
}

export async function addToBankAction(subjectId: string, q: unknown) {
  return run(async () => {
    await addToBank(await staff(), subjectId, q);
    refresh();
  });
}

export async function deleteFromBankAction(id: string) {
  return run(async () => {
    await deleteFromBank(await staff(), id);
    refresh();
  });
}

export async function copyFromBankAction(assignmentId: string, ids: string[]) {
  return run(async () => {
    await copyFromBank(await staff(), assignmentId, ids);
    refresh();
  });
}

export async function announceAction(classId: string, input: { title: string; body: string }) {
  return run(async () => {
    await postAnnouncement(await staff(), classId, input);
    refresh();
  });
}

export async function challengeAction(classId: string, input: unknown) {
  return run(async () => {
    await createChallenge(await staff(), classId, input);
    refresh();
  });
}
