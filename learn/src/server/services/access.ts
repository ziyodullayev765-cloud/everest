import "server-only";
import { and, eq, inArray, isNull, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { db, schema, type Executor } from "../db";
import { isAdmin, isStudent, isTeacher, type Actor } from "../auth/rbac";
import { forbidden, notFound } from "../errors";

/**
 * Data-scoped authorisation. Teachers only see classes they are assigned to (optionally per subject)
 * unless granted "classes.all". Students only see published content targeted at them.
 */

export type TeacherScope = { classId: string; subjectId: string | null };

export async function teacherScopes(teacherId: string, ex: Executor = db): Promise<TeacherScope[]> {
  return ex
    .select({ classId: schema.classTeachers.classId, subjectId: schema.classTeachers.subjectId })
    .from(schema.classTeachers)
    .innerJoin(schema.classes, eq(schema.classes.id, schema.classTeachers.classId))
    .where(and(eq(schema.classTeachers.teacherId, teacherId), isNull(schema.classes.archivedAt)));
}

const hasAllClasses = (a: Actor) => isAdmin(a) || (isTeacher(a) && a.permissions.includes("classes.all"));

/** "all" or the explicit class ids the actor may manage. */
export async function manageableClassIds(a: Actor, ex: Executor = db): Promise<"all" | string[]> {
  if (hasAllClasses(a)) return "all";
  if (!isTeacher(a)) return [];
  return [...new Set((await teacherScopes(a.id, ex)).map((s) => s.classId))];
}

export async function studentClassIds(studentId: string, ex: Executor = db): Promise<string[]> {
  const rows = await ex
    .select({ id: schema.classStudents.classId })
    .from(schema.classStudents)
    .where(eq(schema.classStudents.studentId, studentId));
  return rows.map((r) => r.id);
}

/** Column reference that works both in the query builder (no alias) and in raw SQL using an alias. */
const col = (alias: string | undefined, name: string, c: AnyColumn) => (alias ? sql.raw(`${alias}.${name}`) : sql`${c}`);

/** SQL predicate: assignment is live (published, or scheduled and its time has come). */
export function liveWhere(alias?: string): SQL {
  const status = col(alias, "status", schema.assignments.status);
  return sql`(${status} = 'published' or (${status} = 'scheduled' and ${col(alias, "publish_at", schema.assignments.publishAt)} <= now()))`;
}
export const isLive = liveWhere();

/** SQL predicate: assignment targets this student directly or through one of their classes. */
export function targetsStudent(studentId: string, alias?: string): SQL {
  return sql`exists (
    select 1 from assignment_targets t
    left join class_students cs on cs.class_id = t.class_id and cs.student_id = ${studentId}
    where t.assignment_id = ${col(alias, "id", schema.assignments.id)}
      and (t.student_id = ${studentId} or cs.student_id is not null)
  )`;
}

export async function assertStudentCanSee(studentId: string, assignmentId: string, ex: Executor = db) {
  const rows = await ex
    .select()
    .from(schema.assignments)
    .where(and(eq(schema.assignments.id, assignmentId), isLive, targetsStudent(studentId)))
    .limit(1);
  if (!rows[0]) throw notFound("Vazifa topilmadi.");
  return rows[0];
}

/** Can the actor edit/grade this assignment? Admins: always. Teachers: they created it or it targets their scope. */
export async function canManageAssignment(a: Actor, assignmentId: string, ex: Executor = db): Promise<boolean> {
  if (isAdmin(a)) return true;
  if (!isTeacher(a)) return false;
  const rows = await ex.select().from(schema.assignments).where(eq(schema.assignments.id, assignmentId)).limit(1);
  const asg = rows[0];
  if (!asg) return false;
  if (asg.createdBy === a.id || a.permissions.includes("classes.all")) return true;
  const scopes = await teacherScopes(a.id, ex);
  if (scopes.length === 0) return false;
  const targets = await ex.select().from(schema.assignmentTargets).where(eq(schema.assignmentTargets.assignmentId, assignmentId));
  const studentTargets = targets.filter((t) => t.studentId).map((t) => t.studentId!);
  const classOk = targets.some((t) => t.classId && scopes.some((s) => s.classId === t.classId && (s.subjectId === null || s.subjectId === asg.subjectId)));
  if (classOk) return true;
  if (studentTargets.length) {
    const scopedClassIds = scopes.filter((s) => s.subjectId === null || s.subjectId === asg.subjectId).map((s) => s.classId);
    if (scopedClassIds.length === 0) return false;
    const r = await ex
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.classStudents)
      .where(and(inArray(schema.classStudents.studentId, studentTargets), inArray(schema.classStudents.classId, scopedClassIds)));
    return (r[0]?.n ?? 0) > 0;
  }
  return false;
}

export async function assertCanManageAssignment(a: Actor, assignmentId: string, ex: Executor = db) {
  const rows = await ex.select().from(schema.assignments).where(eq(schema.assignments.id, assignmentId)).limit(1);
  if (!rows[0]) throw notFound("Vazifa topilmadi.");
  if (!(await canManageAssignment(a, assignmentId, ex))) throw forbidden();
  return rows[0];
}

/** Can the actor see this student's private records (submissions, grades)? */
export async function canViewStudent(a: Actor, studentId: string, ex: Executor = db): Promise<boolean> {
  if (a.id === studentId) return true;
  if (isStudent(a)) return false;
  if (hasAllClasses(a)) return true;
  if (!isTeacher(a)) return false;
  const classIds = await manageableClassIds(a, ex);
  if (classIds !== "all" && classIds.length === 0) return false;
  const r = await ex
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.classStudents)
    .where(and(eq(schema.classStudents.studentId, studentId), classIds === "all" ? sql`true` : inArray(schema.classStudents.classId, classIds)));
  return (r[0]?.n ?? 0) > 0;
}

/** Grading requires managing the assignment AND (for teachers) teaching the student. */
export async function assertCanGrade(a: Actor, assignmentId: string, studentId: string, ex: Executor = db) {
  const asg = await assertCanManageAssignment(a, assignmentId, ex);
  if (!(await canViewStudent(a, studentId, ex))) throw forbidden();
  // The student must actually be a target of this assignment.
  const r = await ex
    .select({ id: schema.assignments.id })
    .from(schema.assignments)
    .where(and(eq(schema.assignments.id, assignmentId), targetsStudent(studentId)))
    .limit(1);
  if (!r[0]) throw notFound("O‘quvchi bu vazifaga biriktirilmagan.");
  return asg;
}

/** SQL predicate restricting assignments to what a staff member manages. */
export async function manageableAssignmentsWhere(a: Actor, ex: Executor = db, alias?: string): Promise<SQL> {
  if (hasAllClasses(a)) return sql`true`;
  if (!isTeacher(a)) return sql`false`;
  const scopes = await teacherScopes(a.id, ex);
  const id = col(alias, "id", schema.assignments.id);
  const clauses: SQL[] = [sql`${col(alias, "created_by", schema.assignments.createdBy)} = ${a.id}`];
  for (const s of scopes) {
    clauses.push(sql`exists (
      select 1 from assignment_targets t
      where t.assignment_id = ${id}
        and (t.class_id = ${s.classId} or t.student_id in (select student_id from class_students where class_id = ${s.classId}))
        ${s.subjectId ? sql`and ${col(alias, "subject_id", schema.assignments.subjectId)} = ${s.subjectId}` : sql``}
    )`);
  }
  return sql`(${or(...clauses)!})`;
}
