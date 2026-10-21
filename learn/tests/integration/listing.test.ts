import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/server/db";
import { listClasses, studentClasses } from "@/server/services/classes";
import { listUsers } from "@/server/services/users";
import { listForStaff, saveAssignment } from "@/server/services/assignments";
import { baseAssignment, world } from "./fixtures";

afterAll(async () => closeDb());

/** Regression: correlated subqueries in single-table selects must reference the outer row. */
describe("listing aggregates", () => {
  it("class lists count the right students and teachers", async () => {
    const w = await world();
    const mine = (await listClasses(w.admin)).find((c) => c.id === w.cls.id)!;
    expect(mine.students).toBe(1);
    expect(mine.teachers).toContain(w.teacher.displayName);
    expect(mine.teachers).not.toContain(w.outsiderTeacher.displayName);
    const sc = await studentClasses(w.student.id);
    expect(sc).toHaveLength(1);
    expect(sc[0].teachers).toContain(w.teacher.displayName);
    // Teachers only list their own classes.
    expect((await listClasses(w.teacher)).map((c) => c.id)).toEqual([w.cls.id]);
  });
  it("user list shows each user's own classes and filters by class", async () => {
    const w = await world();
    const rows = await listUsers(w.admin, { role: "student", classId: w.cls.id });
    expect(rows.map((r) => r.id)).toEqual([w.student.id]);
    expect(rows[0].classNames).toBe(w.cls.name);
  });
  it("staff assignment list counts submissions per assignment", async () => {
    const w = await world();
    const { id } = await saveAssignment(w.teacher, null, baseAssignment(w.subject.id, [w.cls.id]));
    const row = (await listForStaff(w.teacher)).find((a) => a.id === id)!;
    expect(row.targetCount).toBe(1);
    expect(row.submittedCount).toBe(0);
  });
});
