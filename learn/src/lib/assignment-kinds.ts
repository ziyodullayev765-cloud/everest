import type { AssignmentType } from "@/server/db/schema";

/** Assignment types that are answered through the quiz engine (questions + attempts). */
export const QUIZ_TYPES: AssignmentType[] = ["multiple_choice", "short_answer", "true_false", "timed_quiz", "practice"];
/** Types answered with a written response and/or files. */
export const WORK_TYPES: AssignmentType[] = ["written", "file_upload", "homework"];

export const isQuizType = (t: AssignmentType) => QUIZ_TYPES.includes(t);
export const isWorkType = (t: AssignmentType) => WORK_TYPES.includes(t);
/** Practice and materials never produce official grades. */
export const isGradedType = (t: AssignmentType) => t !== "practice" && t !== "material";

export type StudentStatus = "new" | "in_progress" | "submitted" | "reviewing" | "graded" | "overdue" | "returned" | "read";

export function deriveStatus(input: {
  type: AssignmentType;
  dueAt: Date | null;
  now?: Date;
  submission: { status: "draft" | "submitted" | "returned" | "graded"; version: number } | null;
  attempts: { open: boolean; submitted: number; pendingManual: boolean };
  grade: { status: "provisional" | "final" } | null;
}): StudentStatus {
  const now = input.now ?? new Date();
  const { type, submission: sub, attempts, grade } = input;
  if (type === "material") return sub && sub.version > 0 ? "read" : "new";
  if (sub?.status === "returned") return "returned";
  if (isQuizType(type)) {
    if (attempts.open) return "in_progress";
    if (attempts.pendingManual) return "reviewing";
    if (grade) return "graded";
    if (attempts.submitted > 0) return type === "practice" ? "submitted" : "reviewing";
  } else {
    if (grade?.status === "final") return "graded";
    if (grade) return "reviewing";
    if (sub && sub.version > 0) return "submitted";
    if (sub?.status === "draft" && input.dueAt && input.dueAt < now) return "overdue";
    if (sub?.status === "draft") return "in_progress";
  }
  if (input.dueAt && input.dueAt < now) return "overdue";
  return "new";
}

export const isDone = (s: StudentStatus) => s === "submitted" || s === "reviewing" || s === "graded" || s === "read";

/** Whether the deadline rules still accept work right now. */
export function submissionWindow(a: { dueAt: Date | null; allowLate: boolean; lateCutoffAt: Date | null }, now = new Date()) {
  if (!a.dueAt || now <= a.dueAt) return { open: true, late: false };
  if (!a.allowLate) return { open: false, late: true };
  if (a.lateCutoffAt && now > a.lateCutoffAt) return { open: false, late: true };
  return { open: true, late: true };
}
