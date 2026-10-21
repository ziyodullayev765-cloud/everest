import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db, schema } from "../db";
import { isAdmin, isStudent, type Actor } from "../auth/rbac";
import { AppError, forbidden, invalid, notFound } from "../errors";
import { audit } from "./audit";
import { manageableClassIds, studentClassIds } from "./access";
import { notify } from "./notifications";
import { enforce } from "./rate-limit";

const classInput = z.object({
  name: z.string().trim().min(1, "Sinf nomi kerak").max(60),
  gradeLevel: z.union([z.coerce.number().int().min(1).max(12), z.literal(""), z.null()]).transform((v) => (v === "" ? null : v)).default(null),
  academicYear: z.string().trim().regex(/^\d{4}[-–/]\d{4}$/, "O‘quv yili 2026-2027 ko‘rinishida").max(20),
});

const subjectInput = z.object({
  name: z.string().trim().min(2, "Fan nomi kerak").max(60),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,12}$/, "Kod 2–12 ta lotin harfi/raqam"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0f766e"),
});

const requireAdmin = (a: Actor) => {
  if (!isAdmin(a)) throw forbidden();
};

// ─── Classes ─────────────────────────────────────────────────────────────────

export async function listClasses(actor: Actor, includeArchived = false) {
  const scope = await manageableClassIds(actor);
  if (scope !== "all" && scope.length === 0) return [];
  return db
    .select({
      id: schema.classes.id,
      name: schema.classes.name,
      gradeLevel: schema.classes.gradeLevel,
      academicYear: schema.classes.academicYear,
      joinCode: schema.classes.joinCode,
      archivedAt: schema.classes.archivedAt,
      students: sql<number>`(select count(*)::int from class_students cs join users u on u.id = cs.student_id where cs.class_id = ${schema.classes.id} and u.status = 'active')`,
      teachers: sql<string>`coalesce((select string_agg(distinct u.display_name, ', ') from class_teachers ct join users u on u.id = ct.teacher_id where ct.class_id = ${schema.classes.id}), '')`,
    })
    .from(schema.classes)
    .where(and(includeArchived ? sql`true` : isNull(schema.classes.archivedAt), scope === "all" ? sql`true` : inArray(schema.classes.id, scope)))
    .orderBy(asc(schema.classes.gradeLevel), asc(schema.classes.name));
}

export async function createClass(actor: Actor, input: unknown) {
  requireAdmin(actor);
  const v = classInput.parse(input);
  const [c] = await db.insert(schema.classes).values(v).returning({ id: schema.classes.id });
  await audit(actor.id, "class.create", "class", c.id, { name: v.name });
  return c.id;
}

export async function updateClass(actor: Actor, id: string, input: unknown) {
  requireAdmin(actor);
  const v = classInput.parse(input);
  await db.update(schema.classes).set(v).where(eq(schema.classes.id, id));
  await audit(actor.id, "class.update", "class", id);
}

/** Archiving hides the class but keeps memberships, submissions and grades intact. */
export async function setClassArchived(actor: Actor, id: string, archived: boolean) {
  requireAdmin(actor);
  await db.update(schema.classes).set({ archivedAt: archived ? new Date() : null, joinCode: archived ? null : undefined }).where(eq(schema.classes.id, id));
  await audit(actor.id, archived ? "class.archive" : "class.restore", "class", id);
}

function newJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return [...randomBytes(6)].map((b) => alphabet[b % alphabet.length]).join("");
}

export async function setJoinCode(actor: Actor, id: string, enabled: boolean) {
  requireAdmin(actor);
  for (let i = 0; i < 5; i++) {
    try {
      const code = enabled ? newJoinCode() : null;
      await db.update(schema.classes).set({ joinCode: code }).where(eq(schema.classes.id, id));
      await audit(actor.id, enabled ? "class.join_code" : "class.join_code_off", "class", id);
      return code;
    } catch (e) {
      if ((e as { code?: string }).code !== "23505") throw e;
    }
  }
  throw new AppError("conflict", "Kod yaratilmadi, qayta urinib ko‘ring.");
}

export async function joinByCode(actor: Actor, codeRaw: string) {
  if (!isStudent(actor)) throw forbidden("Faqat o‘quvchilar kod orqali qo‘shiladi.");
  await enforce(`join:${actor.id}`, 10, 3600);
  const code = codeRaw.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) throw invalid("Kod 6 ta belgidan iborat.");
  const [c] = await db.select().from(schema.classes).where(and(eq(schema.classes.joinCode, code), isNull(schema.classes.archivedAt)));
  if (!c) throw invalid("Bunday kod topilmadi.");
  await db.insert(schema.classStudents).values({ classId: c.id, studentId: actor.id }).onConflictDoNothing();
  await audit(actor.id, "class.join", "class", c.id);
  return c;
}

export async function classDetailForAdmin(actor: Actor, id: string) {
  const scope = await manageableClassIds(actor);
  if (scope !== "all" && !scope.includes(id)) throw forbidden();
  const [c] = await db.select().from(schema.classes).where(eq(schema.classes.id, id));
  if (!c) throw notFound();
  const [students, teachers] = await Promise.all([
    db
      .select({ id: schema.users.id, displayName: schema.users.displayName, username: schema.users.username, status: schema.users.status, studentCode: schema.users.studentCode })
      .from(schema.classStudents)
      .innerJoin(schema.users, eq(schema.users.id, schema.classStudents.studentId))
      .where(eq(schema.classStudents.classId, id))
      .orderBy(asc(schema.users.displayName)),
    db
      .select({ id: schema.classTeachers.id, teacherId: schema.users.id, displayName: schema.users.displayName, subjectId: schema.classTeachers.subjectId, subjectName: schema.subjects.name })
      .from(schema.classTeachers)
      .innerJoin(schema.users, eq(schema.users.id, schema.classTeachers.teacherId))
      .leftJoin(schema.subjects, eq(schema.subjects.id, schema.classTeachers.subjectId))
      .where(eq(schema.classTeachers.classId, id)),
  ]);
  return { cls: c, students, teachers };
}

export async function enroll(actor: Actor, classId: string, studentIds: string[], add: boolean) {
  requireAdmin(actor);
  const ids = z.array(z.string().uuid()).max(500).parse(studentIds);
  if (!ids.length) return;
  if (add) {
    const valid = await db.select({ id: schema.users.id }).from(schema.users).where(and(inArray(schema.users.id, ids), eq(schema.users.role, "student")));
    if (valid.length) await db.insert(schema.classStudents).values(valid.map((v) => ({ classId, studentId: v.id }))).onConflictDoNothing();
  } else await db.delete(schema.classStudents).where(and(eq(schema.classStudents.classId, classId), inArray(schema.classStudents.studentId, ids)));
  await audit(actor.id, add ? "class.enroll" : "class.unenroll", "class", classId, { count: ids.length });
}

export async function assignTeacher(actor: Actor, classId: string, teacherId: string, subjectId: string | null) {
  requireAdmin(actor);
  const [t] = await db.select().from(schema.users).where(eq(schema.users.id, teacherId));
  if (!t || t.role !== "teacher") throw invalid("O‘qituvchi topilmadi.");
  await db.insert(schema.classTeachers).values({ classId, teacherId, subjectId }).onConflictDoNothing();
  await audit(actor.id, "class.assign_teacher", "class", classId, { teacherId, subjectId });
}

export async function unassignTeacher(actor: Actor, classTeacherId: string) {
  requireAdmin(actor);
  const [row] = await db.delete(schema.classTeachers).where(eq(schema.classTeachers.id, classTeacherId)).returning();
  if (row) await audit(actor.id, "class.unassign_teacher", "class", row.classId, { teacherId: row.teacherId });
}

// ─── Subjects ────────────────────────────────────────────────────────────────

export async function createSubject(actor: Actor, input: unknown) {
  requireAdmin(actor);
  const v = subjectInput.parse(input);
  try {
    const [s] = await db.insert(schema.subjects).values(v).returning({ id: schema.subjects.id });
    await audit(actor.id, "subject.create", "subject", s.id, { name: v.name });
    return s.id;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw invalid("Bu kod band.");
    throw e;
  }
}

export async function updateSubject(actor: Actor, id: string, input: unknown) {
  requireAdmin(actor);
  const v = subjectInput.parse(input);
  await db.update(schema.subjects).set(v).where(eq(schema.subjects.id, id));
  await audit(actor.id, "subject.update", "subject", id);
}

export async function setSubjectArchived(actor: Actor, id: string, archived: boolean) {
  requireAdmin(actor);
  await db.update(schema.subjects).set({ archivedAt: archived ? new Date() : null }).where(eq(schema.subjects.id, id));
  await audit(actor.id, archived ? "subject.archive" : "subject.restore", "subject", id);
}

// ─── Student-facing class pages, announcements, challenges ───────────────────

export async function studentClasses(studentId: string) {
  const ids = await studentClassIds(studentId);
  if (!ids.length) return [];
  return db
    .select({
      id: schema.classes.id,
      name: schema.classes.name,
      academicYear: schema.classes.academicYear,
      archivedAt: schema.classes.archivedAt,
      teachers: sql<string>`coalesce((select string_agg(distinct u.display_name, ', ') from class_teachers ct join users u on u.id = ct.teacher_id where ct.class_id = ${schema.classes.id}), '')`,
      subjects: sql<string>`coalesce((select string_agg(distinct s.name, ', ') from class_teachers ct join subjects s on s.id = ct.subject_id where ct.class_id = ${schema.classes.id}), '')`,
    })
    .from(schema.classes)
    .where(inArray(schema.classes.id, ids))
    .orderBy(asc(schema.classes.name));
}

async function assertClassAccess(actor: Actor, classId: string) {
  if (isStudent(actor)) {
    if (!(await studentClassIds(actor.id)).includes(classId)) throw notFound();
    return;
  }
  const scope = await manageableClassIds(actor);
  if (scope !== "all" && !scope.includes(classId)) throw forbidden();
}

export async function classPage(actor: Actor, classId: string) {
  await assertClassAccess(actor, classId);
  const [c] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
  if (!c) throw notFound();
  const [teachers, ann, challenges, studentCount] = await Promise.all([
    db
      .select({ name: schema.users.displayName, subject: schema.subjects.name, color: schema.subjects.color })
      .from(schema.classTeachers)
      .innerJoin(schema.users, eq(schema.users.id, schema.classTeachers.teacherId))
      .leftJoin(schema.subjects, eq(schema.subjects.id, schema.classTeachers.subjectId))
      .where(eq(schema.classTeachers.classId, classId)),
    db
      .select({ id: schema.announcements.id, title: schema.announcements.title, body: schema.announcements.body, createdAt: schema.announcements.createdAt, author: schema.users.displayName })
      .from(schema.announcements)
      .innerJoin(schema.users, eq(schema.users.id, schema.announcements.authorId))
      .where(eq(schema.announcements.classId, classId))
      .orderBy(desc(schema.announcements.createdAt))
      .limit(30),
    challengesFor(classId),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.classStudents).where(eq(schema.classStudents.classId, classId)),
  ]);
  return { cls: c, teachers, announcements: ann, challenges, studentCount: studentCount[0]?.n ?? 0 };
}

/** Aggregate progress only — no individual is singled out. */
async function challengesFor(classId: string) {
  const rows = await db.execute<{ id: string; title: string; target: number; starts_at: string; ends_at: string; progress: number }>(sql`
    select c.id, c.title, c.target_submissions as target, c.starts_at, c.ends_at,
      ((select count(*) from submission_versions v join submissions s on s.id = v.submission_id
         where v.version = 1 and v.submitted_at between c.starts_at and c.ends_at and s.student_id in (select student_id from class_students where class_id = c.class_id))
       + (select count(*) from quiz_attempts qa where qa.attempt_no = 1 and qa.status <> 'in_progress' and qa.submitted_at between c.starts_at and c.ends_at
         and qa.student_id in (select student_id from class_students where class_id = c.class_id)))::int as progress
    from class_challenges c where c.class_id = ${classId} and c.ends_at > now() - interval '14 days'
    order by c.ends_at desc`);
  return rows.map((r) => ({ id: r.id, title: r.title, target: r.target, startsAt: new Date(r.starts_at), endsAt: new Date(r.ends_at), progress: r.progress }));
}

export async function postAnnouncement(actor: Actor, classId: string, input: { title: string; body: string }) {
  if (isStudent(actor)) throw forbidden();
  await assertClassAccess(actor, classId);
  const v = z.object({ title: z.string().trim().min(2).max(120), body: z.string().trim().min(2).max(5000) }).parse(input);
  await db.insert(schema.announcements).values({ classId, authorId: actor.id, ...v });
  const students = await db.select({ id: schema.classStudents.studentId }).from(schema.classStudents).where(eq(schema.classStudents.classId, classId));
  await notify(students.map((s) => s.id), { type: "announcement", title: v.title, body: v.body.slice(0, 200), link: `/classes/${classId}` });
  await audit(actor.id, "announcement.create", "class", classId);
}

export async function createChallenge(actor: Actor, classId: string, input: unknown) {
  if (isStudent(actor)) throw forbidden();
  await assertClassAccess(actor, classId);
  const v = z
    .object({ title: z.string().trim().min(3).max(120), targetSubmissions: z.coerce.number().int().min(1).max(10000), days: z.coerce.number().int().min(1).max(60) })
    .parse(input);
  const startsAt = new Date();
  await db.insert(schema.classChallenges).values({ classId, title: v.title, targetSubmissions: v.targetSubmissions, startsAt, endsAt: new Date(startsAt.getTime() + v.days * 86400_000), createdBy: actor.id });
  await audit(actor.id, "challenge.create", "class", classId);
}

export async function listTeachers() {
  return db
    .select({ id: schema.users.id, displayName: schema.users.displayName })
    .from(schema.users)
    .where(and(eq(schema.users.role, "teacher"), eq(schema.users.status, "active")))
    .orderBy(asc(schema.users.displayName));
}

/** Students the actor may target individually (their classes' students). */
export async function targetableStudents(actor: Actor) {
  const scope = await manageableClassIds(actor);
  if (scope !== "all" && !scope.length) return [];
  const rows = await db.execute<{ id: string; display_name: string; class_name: string }>(sql`
    select u.id, u.display_name, coalesce(string_agg(c.name, ', ' order by c.name), '') as class_name
    from users u
    left join class_students cs on cs.student_id = u.id
    left join classes c on c.id = cs.class_id and c.archived_at is null
    where u.role = 'student' and u.status = 'active'
      ${scope === "all" ? sql`` : sql`and cs.class_id in ${scope}`}
    group by u.id, u.display_name order by u.display_name limit 2000`);
  return rows.map((r) => ({ id: r.id, displayName: r.display_name, className: r.class_name }));
}
