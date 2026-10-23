import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { type Actor } from "../auth/rbac";
import { forbidden } from "../errors";
import { manageableClassIds } from "./access";
import { audit } from "./audit";
import { MARK_AREA_KEYS } from "@/lib/marks";
import { localDay } from "@/lib/dates";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const todayLocal = () => localDay(new Date());

async function assertManages(actor: Actor, classId: string) {
  const scope = await manageableClassIds(actor);
  if (scope !== "all" && !scope.includes(classId)) throw forbidden();
}

/** Students of a group with their marks for one day (all skills). */
export async function marksSheet(actor: Actor, classId: string, day: string) {
  await assertManages(actor, classId);
  if (!DAY.test(day)) day = todayLocal();
  const [students, marks] = await Promise.all([
    db
      .select({ id: schema.users.id, name: schema.users.displayName })
      .from(schema.classStudents)
      .innerJoin(schema.users, eq(schema.users.id, schema.classStudents.studentId))
      .where(and(eq(schema.classStudents.classId, classId), eq(schema.users.role, "student"), eq(schema.users.status, "active")))
      .orderBy(asc(schema.users.displayName)),
    db
      .select({ studentId: schema.lessonMarks.studentId, area: schema.lessonMarks.area, mark: schema.lessonMarks.mark })
      .from(schema.lessonMarks)
      .where(and(eq(schema.lessonMarks.classId, classId), eq(schema.lessonMarks.lessonDate, day))),
  ]);
  const byStudent = new Map<string, Record<string, number>>();
  for (const m of marks) byStudent.set(m.studentId, { ...byStudent.get(m.studentId), [m.area]: m.mark });
  return { day, students: students.map((s) => ({ ...s, marks: byStudent.get(s.id) ?? {} })) };
}

const setSchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  area: z.enum(MARK_AREA_KEYS),
  day: z.string().regex(DAY),
  mark: z.union([z.literal(3), z.literal(4), z.literal(5), z.null()]),
});

/** Sets (or with mark = null clears) one student's mark for a skill on a day. */
export async function setMark(actor: Actor, input: unknown) {
  const v = setSchema.parse(input);
  await assertManages(actor, v.classId);
  if (v.day > todayLocal()) throw forbidden("Kelajakdagi kunga baho qo‘yib bo‘lmaydi.");
  const [member] = await db
    .select({ id: schema.classStudents.studentId })
    .from(schema.classStudents)
    .where(and(eq(schema.classStudents.classId, v.classId), eq(schema.classStudents.studentId, v.studentId)));
  if (!member) throw forbidden("O‘quvchi bu guruhda emas.");
  const key = and(
    eq(schema.lessonMarks.classId, v.classId),
    eq(schema.lessonMarks.studentId, v.studentId),
    eq(schema.lessonMarks.area, v.area),
    eq(schema.lessonMarks.lessonDate, v.day),
  );
  if (v.mark == null) await db.delete(schema.lessonMarks).where(key);
  else
    await db
      .insert(schema.lessonMarks)
      .values({ classId: v.classId, studentId: v.studentId, area: v.area, lessonDate: v.day, mark: v.mark, givenBy: actor.id })
      .onConflictDoUpdate({
        target: [schema.lessonMarks.classId, schema.lessonMarks.studentId, schema.lessonMarks.area, schema.lessonMarks.lessonDate],
        set: { mark: v.mark, givenBy: actor.id, updatedAt: new Date() },
      });
  await audit(actor.id, v.mark == null ? "mark.clear" : "mark.set", "user", v.studentId, { classId: v.classId, area: v.area, day: v.day, mark: v.mark });
}

/** A student's marks, newest first (for their own grades page or a teacher's student view). */
export async function studentMarks(studentId: string, limit = 400) {
  return db
    .select({ area: schema.lessonMarks.area, day: schema.lessonMarks.lessonDate, mark: schema.lessonMarks.mark, className: schema.classes.name })
    .from(schema.lessonMarks)
    .innerJoin(schema.classes, eq(schema.classes.id, schema.lessonMarks.classId))
    .where(eq(schema.lessonMarks.studentId, studentId))
    .orderBy(desc(schema.lessonMarks.lessonDate), asc(schema.lessonMarks.area))
    .limit(limit);
}

/** Per-student, per-skill averages in a group over a date range (for the teacher's summary). */
export async function marksSummary(actor: Actor, classId: string, from: string, to: string) {
  await assertManages(actor, classId);
  const rows = await db.execute<{ student_id: string; area: string; avg: number; n: number }>(sql`
    select student_id, area, round(avg(mark)::numeric, 2)::float8 as avg, count(*)::int as n from lesson_marks
    where class_id = ${classId} and lesson_date between ${from} and ${to} group by 1, 2`);
  return rows.map((r) => ({ studentId: r.student_id, area: r.area, avg: r.avg, n: r.n }));
}
