import { db, schema } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import type { Actor } from "@/server/auth/rbac";
import type { Role } from "@/server/db/schema";
import { sql } from "drizzle-orm";

let n = 0;
let hash: string | null = null;

export async function makeUser(role: Role, extra: { permissions?: string[]; name?: string } = {}): Promise<Actor & { username: string }> {
  hash ??= await hashPassword("Parol123");
  const username = `${role.replace("_", "")}${++n}${Date.now().toString(36)}`;
  const [u] = await db
    .insert(schema.users)
    .values({ role, username, displayName: extra.name ?? `${role} ${n}`, passwordHash: hash, permissions: extra.permissions ?? [] })
    .returning();
  return { id: u.id, role: u.role, permissions: u.permissions, displayName: u.displayName, username };
}

export async function makeSubject(name = "Matematika") {
  const [s] = await db.insert(schema.subjects).values({ name, code: `S${++n}${Date.now().toString(36).slice(-4)}`.toUpperCase() }).returning();
  return s;
}

export async function makeClass(name = "7-A") {
  const [c] = await db.insert(schema.classes).values({ name: `${name}-${++n}`, academicYear: "2026-2027" }).returning();
  return c;
}

export async function enroll(classId: string, studentId: string) {
  await db.insert(schema.classStudents).values({ classId, studentId });
}

export async function teach(classId: string, teacherId: string, subjectId: string | null = null) {
  await db.insert(schema.classTeachers).values({ classId, teacherId, subjectId });
}

/** A world with one class, a teacher of that class, a student in it and a student elsewhere. */
export async function world() {
  const subject = await makeSubject();
  const cls = await makeClass();
  const other = await makeClass("8-B");
  const admin = await makeUser("admin");
  const teacher = await makeUser("teacher", { permissions: ["assignments.create"] });
  const outsiderTeacher = await makeUser("teacher", { permissions: ["assignments.create"] });
  const student = await makeUser("student", { name: "Ali Valiyev" });
  const otherStudent = await makeUser("student", { name: "Boshqa O‘quvchi" });
  await enroll(cls.id, student.id);
  await enroll(other.id, otherStudent.id);
  await teach(cls.id, teacher.id, subject.id);
  await teach(other.id, outsiderTeacher.id, subject.id);
  return { subject, cls, other, admin, teacher, outsiderTeacher, student, otherStudent };
}

export const baseAssignment = (subjectId: string, classIds: string[], over: Record<string, unknown> = {}) => ({
  title: "Kasrlar ustida amallar",
  description: "Uy vazifasi",
  instructions: "1–10 misollarni yeching",
  type: "written",
  subjectId,
  publishMode: "now",
  maxScore: 10,
  classIds,
  ...over,
});

export async function count(table: string) {
  const r = await db.execute<{ n: number }>(sql.raw(`select count(*)::int as n from ${table}`));
  return r[0].n;
}
