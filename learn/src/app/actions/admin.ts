"use server";
import { revalidatePath } from "next/cache";
import { run } from "@/server/action";
import { requireRole } from "@/server/auth/session";
import { createResetLink, createUser, importStudents, setClassMemberships, setUserStatus, updateUser } from "@/server/services/users";
import { assignTeacher, createClass, createSubject, enroll, setClassArchived, setJoinCode, setSubjectArchived, unassignTeacher, updateClass, updateSubject } from "@/server/services/classes";
import { updateSettings } from "@/server/services/settings";
import { saveBook, setBookStatus } from "@/server/services/library";
import { env } from "@/server/env";
import type { SessionUser } from "@/server/auth/session";

/** Every admin action re-checks the role on the server and refreshes cached pages afterwards. */
function adminRun<R>(fn: (actor: SessionUser) => Promise<R>) {
  return run(async () => {
    const r = await fn(await requireRole("admin", "super_admin"));
    revalidatePath("/", "layout");
    return r;
  });
}

export async function createUserAction(input: unknown) {
  return adminRun((u) => createUser(u, input));
}
export async function updateUserAction(id: string, input: unknown) {
  return adminRun((u) => updateUser(u, id, input));
}
export async function userStatusAction(id: string, status: "active" | "deactivated") {
  return adminRun((u) => setUserStatus(u, id, status));
}
export async function membershipsAction(id: string, classIds: string[]) {
  return adminRun((u) => setClassMemberships(u, id, classIds));
}
export async function importStudentsAction(text: string) {
  return adminRun((u) => importStudents(u, text));
}
export async function resetLinkAction(id: string) {
  return adminRun(async (u) => `${env.appUrl}/reset/${await createResetLink(u, id)}`);
}
export async function createClassAction(input: unknown) {
  return adminRun((u) => createClass(u, input));
}
export async function updateClassAction(id: string, input: unknown) {
  return adminRun((u) => updateClass(u, id, input));
}
export async function archiveClassAction(id: string, archived: boolean) {
  return adminRun((u) => setClassArchived(u, id, archived));
}
export async function joinCodeAction(id: string, enabled: boolean) {
  return adminRun((u) => setJoinCode(u, id, enabled));
}
export async function enrollAction(classId: string, ids: string[], add: boolean) {
  return adminRun((u) => enroll(u, classId, ids, add));
}
export async function assignTeacherAction(classId: string, teacherId: string, subjectId: string | null) {
  return adminRun((u) => assignTeacher(u, classId, teacherId, subjectId));
}
export async function unassignTeacherAction(id: string) {
  return adminRun((u) => unassignTeacher(u, id));
}
export async function createSubjectAction(input: unknown) {
  return adminRun((u) => createSubject(u, input));
}
export async function updateSubjectAction(id: string, input: unknown) {
  return adminRun((u) => updateSubject(u, id, input));
}
export async function archiveSubjectAction(id: string, archived: boolean) {
  return adminRun((u) => setSubjectArchived(u, id, archived));
}
export async function settingsAction(input: unknown) {
  return adminRun((u) => updateSettings(u, input));
}
export async function saveBookAction(id: string | null, input: unknown) {
  return adminRun((u) => saveBook(u, id, input));
}
export async function bookStatusAction(id: string, status: "draft" | "published" | "archived") {
  return adminRun((u) => setBookStatus(u, id, status));
}
