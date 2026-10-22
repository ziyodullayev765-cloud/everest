import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { canManageRole, isAdmin, PERMISSIONS, type Actor } from "../auth/rbac";
import { dummyHash, generateTempPassword, hashPassword, passwordProblem, verifyPassword } from "../auth/password";
import { createSession, destroyAllSessions } from "../auth/session";
import { keyedHash, randomToken, sha256 } from "../crypto";
import { AppError, forbidden, invalid, isUniqueViolation, notFound } from "../errors";
import { parseCsv } from "@/lib/utils";
import type { Role } from "../db/schema";
import { audit, clientIp } from "./audit";
import { enforce, reset as resetLimit } from "./rate-limit";
import { canViewStudent, manageableClassIds } from "./access";
import { assertOwnFiles } from "./files";
import { getSettings } from "./settings";

const GENERIC_LOGIN_ERROR = "Login yoki parol noto‘g‘ri.";

// ─── Authentication ──────────────────────────────────────────────────────────

export async function login(usernameRaw: string, password: string) {
  const username = usernameRaw.trim().toLowerCase().slice(0, 60);
  const ip = await clientIp();
  await enforce(`login-ip:${keyedHash(ip)}`, 30, 15 * 60);
  await enforce(`login-user:${keyedHash(username)}`, 8, 15 * 60);
  if (!username || !password || password.length > 200) throw new AppError("invalid", GENERIC_LOGIN_ERROR);
  const rows = await db.select().from(schema.users).where(sql`lower(${schema.users.username}) = ${username}`).limit(1);
  const user = rows[0];
  // Hash even when the user doesn't exist so response time doesn't reveal valid usernames.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !ok || user.status !== "active") {
    await audit(user?.id ?? null, "auth.login_failed", "user", user?.id ?? null, { username: user ? undefined : "unknown" });
    throw new AppError("invalid", GENERIC_LOGIN_ERROR);
  }
  await resetLimit(`login-user:${keyedHash(username)}`);
  await createSession(user.id);
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  await audit(user.id, "auth.login", "user", user.id);
  return user;
}

export async function changePassword(actor: Actor, current: string, next: string) {
  await enforce(`pw-change:${actor.id}`, 10, 15 * 60);
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, actor.id));
  if (!u || !(await verifyPassword(current, u.passwordHash))) throw invalid("Joriy parol noto‘g‘ri.", { current: "Joriy parol noto‘g‘ri." });
  const problem = passwordProblem(next);
  if (problem) throw invalid(problem, { next: problem });
  if (await verifyPassword(next, u.passwordHash)) throw invalid("Yangi parol eskisidan farq qilishi kerak.", { next: "Yangi parol eskisidan farq qilishi kerak." });
  await db.update(schema.users).set({ passwordHash: await hashPassword(next), mustChangePassword: false, updatedAt: new Date() }).where(eq(schema.users.id, actor.id));
  // Sign out every other device.
  await destroyAllSessions(actor.id);
  await createSession(actor.id);
  await audit(actor.id, "auth.password_change", "user", actor.id);
}

/** Admin-issued one-time reset link (24h). Suitable for minors without e-mail: the link is handed over in person. */
export async function createResetLink(actor: Actor, userId: string) {
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!u) throw notFound();
  if (!canManageRole(actor, u.role)) throw forbidden();
  const token = randomToken(24);
  await db.update(schema.passwordResets).set({ usedAt: new Date() }).where(and(eq(schema.passwordResets.userId, userId), isNull(schema.passwordResets.usedAt)));
  await db.insert(schema.passwordResets).values({ tokenHash: sha256(token), userId, createdBy: actor.id, expiresAt: new Date(Date.now() + 24 * 3600_000) });
  await audit(actor.id, "user.reset_link", "user", userId);
  return token;
}

export async function resetTokenValid(token: string) {
  if (!token || token.length > 100) return null;
  const [r] = await db
    .select({ userId: schema.passwordResets.userId, expiresAt: schema.passwordResets.expiresAt, usedAt: schema.passwordResets.usedAt, name: schema.users.displayName })
    .from(schema.passwordResets)
    .innerJoin(schema.users, eq(schema.users.id, schema.passwordResets.userId))
    .where(and(eq(schema.passwordResets.tokenHash, sha256(token)), eq(schema.users.status, "active")));
  if (!r || r.usedAt || r.expiresAt < new Date()) return null;
  return r;
}

export async function consumeReset(token: string, password: string) {
  const ip = await clientIp();
  await enforce(`reset-ip:${keyedHash(ip)}`, 10, 15 * 60);
  const problem = passwordProblem(password);
  if (problem) throw invalid(problem);
  const userId = await db.transaction(async (tx) => {
    const rows = await tx.execute<{ user_id: string }>(sql`
      update password_resets set used_at = now()
      where token_hash = ${sha256(token)} and used_at is null and expires_at > now()
      returning user_id`);
    const id = rows[0]?.user_id;
    if (!id) throw new AppError("invalid", "Havola eskirgan yoki allaqachon ishlatilgan.");
    await tx.update(schema.users).set({ passwordHash: await hashPassword(password), mustChangePassword: false, updatedAt: new Date() }).where(eq(schema.users.id, id));
    return id;
  });
  await destroyAllSessions(userId);
  await audit(userId, "auth.password_reset", "user", userId);
}

// ─── Provisioning ────────────────────────────────────────────────────────────

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,40}$/, "Login 3–40 ta lotin harfi, raqam, nuqta, _ yoki - dan iborat bo‘lishi kerak");

export const userInput = z.object({
  role: z.enum(["super_admin", "admin", "teacher", "student"]),
  username: usernameSchema,
  displayName: z.string().trim().min(2, "Ism kamida 2 belgi").max(80),
  email: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null)
    .pipe(z.string().email("E-pochta noto‘g‘ri").nullable())
    .default(""),
  studentCode: z
    .string()
    .trim()
    .max(40)
    .transform((v) => v || null)
    .default(""),
  classIds: z.array(z.string().uuid()).max(20).default([]),
  permissions: z.array(z.enum(Object.keys(PERMISSIONS) as [keyof typeof PERMISSIONS])).default([]),
});

function uniqueViolation(e: unknown, fallback: string) {
  // drizzle wraps the driver error; the constraint name lives on the cause.
  const cause = (e as { cause?: { message?: string; constraint_name?: string } })?.cause;
  const msg = `${cause?.constraint_name ?? ""} ${cause?.message ?? (e as { message?: string })?.message ?? ""}`;
  if (isUniqueViolation(e) || msg.includes("duplicate key")) {
    if (msg.includes("username")) return invalid("Bu login band.", { username: "Bu login band." });
    if (msg.includes("email")) return invalid("Bu e-pochta band.", { email: "Bu e-pochta band." });
    if (msg.includes("student_code")) return invalid("Bu o‘quvchi ID band.", { studentCode: "Bu o‘quvchi ID band." });
    return invalid(fallback);
  }
  return e;
}

export async function createUser(actor: Actor, input: unknown) {
  const parsed = userInput.safeParse(input);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]));
    throw invalid(parsed.error.issues[0]?.message ?? "Ma’lumotlar noto‘g‘ri", fields);
  }
  const v = parsed.data;
  if (!canManageRole(actor, v.role)) throw forbidden("Bu roldagi foydalanuvchini yarata olmaysiz.");
  const temp = generateTempPassword();
  try {
    const id = await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(schema.users)
        .values({
          role: v.role,
          username: v.username,
          displayName: v.displayName,
          email: v.email,
          studentCode: v.role === "student" ? v.studentCode : null,
          passwordHash: await hashPassword(temp),
          mustChangePassword: true,
          permissions: v.role === "teacher" ? v.permissions : [],
        })
        .returning({ id: schema.users.id });
      if (v.role === "student" && v.classIds.length) await tx.insert(schema.classStudents).values(v.classIds.map((classId) => ({ classId, studentId: u.id })));
      if (v.role === "teacher" && v.classIds.length) await tx.insert(schema.classTeachers).values(v.classIds.map((classId) => ({ classId, teacherId: u.id })));
      await audit(actor.id, "user.create", "user", u.id, { role: v.role, username: v.username }, tx);
      return u.id;
    });
    return { id, tempPassword: temp };
  } catch (e) {
    throw uniqueViolation(e, "Foydalanuvchi yaratilmadi.");
  }
}

const updateInput = userInput.pick({ displayName: true, email: true, studentCode: true, permissions: true }).extend({ username: usernameSchema });

export async function updateUser(actor: Actor, id: string, input: unknown) {
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!u) throw notFound();
  if (!canManageRole(actor, u.role)) throw forbidden();
  const parsed = updateInput.safeParse(input);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? "Ma’lumotlar noto‘g‘ri");
  const v = parsed.data;
  try {
    await db
      .update(schema.users)
      .set({ username: v.username, displayName: v.displayName, email: v.email, studentCode: u.role === "student" ? v.studentCode : null, permissions: u.role === "teacher" ? v.permissions : [], updatedAt: new Date() })
      .where(eq(schema.users.id, id));
  } catch (e) {
    throw uniqueViolation(e, "Saqlanmadi.");
  }
  await audit(actor.id, "user.update", "user", id, { permissions: u.role === "teacher" ? v.permissions : undefined });
}

export async function setUserStatus(actor: Actor, id: string, status: "active" | "deactivated") {
  if (id === actor.id) throw invalid("O‘zingizni o‘chira olmaysiz.");
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!u) throw notFound();
  if (!canManageRole(actor, u.role)) throw forbidden();
  await db.update(schema.users).set({ status, updatedAt: new Date() }).where(eq(schema.users.id, id));
  if (status === "deactivated") await destroyAllSessions(id);
  await audit(actor.id, status === "active" ? "user.reactivate" : "user.deactivate", "user", id);
}

export async function setClassMemberships(actor: Actor, userId: string, classIds: string[]) {
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!u) throw notFound();
  if (!canManageRole(actor, u.role) || u.role !== "student") throw forbidden();
  const ids = z.array(z.string().uuid()).max(20).parse(classIds);
  await db.transaction(async (tx) => {
    // Memberships are the only thing removed; grades and submissions stay attached to the student.
    await tx.delete(schema.classStudents).where(eq(schema.classStudents.studentId, userId));
    if (ids.length) await tx.insert(schema.classStudents).values(ids.map((classId) => ({ classId, studentId: userId })));
    await audit(actor.id, "user.classes", "user", userId, { classIds: ids }, tx);
  });
}

export type CsvImportResult = { created: { username: string; displayName: string; tempPassword: string; className: string }[]; errors: { line: number; message: string }[] };

/**
 * Imports students from CSV with header: username,display_name,class,student_code,email
 * (`class` matches a class name or join code). All-or-nothing: any invalid row aborts the import.
 */
export async function importStudents(actor: Actor, text: string): Promise<CsvImportResult> {
  if (!isAdmin(actor)) throw forbidden();
  if (text.length > 1_000_000) throw invalid("Fayl juda katta (1 MB gacha).");
  const rows = parseCsv(text);
  if (rows.length < 2) throw invalid("CSV bo‘sh yoki sarlavha qatori yo‘q.");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (n: string) => header.indexOf(n);
  if (col("username") < 0 || col("display_name") < 0) throw invalid("Sarlavhada username va display_name ustunlari bo‘lishi kerak.");
  if (rows.length > 1001) throw invalid("Bir martada ko‘pi bilan 1000 ta o‘quvchi.");
  const classes = await db.select().from(schema.classes).where(isNull(schema.classes.archivedAt));
  const errors: CsvImportResult["errors"] = [];
  const parsed: { username: string; displayName: string; studentCode: string | null; email: string | null; classId: string | null; className: string; line: number }[] = [];
  const seen = new Set<string>();
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const get = (n: string) => (col(n) >= 0 ? (r[col(n)] ?? "").trim() : "");
    const un = usernameSchema.safeParse(get("username"));
    if (!un.success) return errors.push({ line, message: un.error.issues[0].message });
    if (seen.has(un.data)) return errors.push({ line, message: `“${un.data}” takrorlangan` });
    seen.add(un.data);
    const name = get("display_name");
    if (name.length < 2 || name.length > 80) return errors.push({ line, message: "Ism 2–80 belgi bo‘lishi kerak" });
    const email = get("email") || null;
    if (email && !z.string().email().safeParse(email).success) return errors.push({ line, message: "E-pochta noto‘g‘ri" });
    const cname = get("class");
    const cls = cname ? classes.find((c) => c.name.toLowerCase() === cname.toLowerCase() || c.joinCode === cname.toUpperCase()) : null;
    if (cname && !cls) return errors.push({ line, message: `Guruh topilmadi: “${cname}”` });
    parsed.push({ username: un.data, displayName: name, studentCode: get("student_code") || null, email, classId: cls?.id ?? null, className: cls?.name ?? "", line });
  });
  if (parsed.length) {
    const taken = await db.select({ u: schema.users.username }).from(schema.users).where(inArray(sql`lower(${schema.users.username})`, parsed.map((p) => p.username)));
    for (const t of taken) {
      const p = parsed.find((x) => x.username === t.u.toLowerCase());
      if (p) errors.push({ line: p.line, message: `“${t.u}” logini band` });
    }
  }
  if (errors.length) return { created: [], errors: errors.sort((a, b) => a.line - b.line) };

  const created: CsvImportResult["created"] = [];
  try {
    await db.transaction(async (tx) => {
      for (const p of parsed) {
        const temp = generateTempPassword();
        const [u] = await tx
          .insert(schema.users)
          .values({ role: "student", username: p.username, displayName: p.displayName, email: p.email, studentCode: p.studentCode, passwordHash: await hashPassword(temp), mustChangePassword: true })
          .returning({ id: schema.users.id });
        if (p.classId) await tx.insert(schema.classStudents).values({ classId: p.classId, studentId: u.id });
        created.push({ username: p.username, displayName: p.displayName, tempPassword: temp, className: p.className });
      }
      await audit(actor.id, "user.import", "user", null, { count: parsed.length }, tx);
    });
  } catch (e) {
    throw uniqueViolation(e, "Import bajarilmadi: takrorlangan qiymat bor.");
  }
  return { created, errors: [] };
}

// ─── Reading ─────────────────────────────────────────────────────────────────

export async function listUsers(actor: Actor, f: { role: Role | "staff"; q?: string; status?: string; classId?: string }) {
  if (!isAdmin(actor)) throw forbidden();
  const conds: SQL[] = [f.role === "staff" ? inArray(schema.users.role, ["teacher", "admin", "super_admin"]) : eq(schema.users.role, f.role)];
  if (f.status === "active" || f.status === "deactivated") conds.push(eq(schema.users.status, f.status));
  if (f.q) {
    const like = "%" + f.q.replace(/[%_\\]/g, "\\$&") + "%";
    conds.push(or(ilike(schema.users.displayName, like), ilike(schema.users.username, like), ilike(schema.users.studentCode, like))!);
  }
  if (f.classId) conds.push(sql`exists (select 1 from class_students cs where cs.student_id = users.id and cs.class_id = ${f.classId})`);
  return db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      email: schema.users.email,
      role: schema.users.role,
      status: schema.users.status,
      studentCode: schema.users.studentCode,
      permissions: schema.users.permissions,
      lastLoginAt: schema.users.lastLoginAt,
      createdAt: schema.users.createdAt,
      classNames: sql<string>`coalesce((
        select string_agg(c.name, ', ' order by c.name) from classes c
        where c.id in (select class_id from class_students where student_id = users.id union select class_id from class_teachers where teacher_id = users.id)
      ), '')`,
    })
    .from(schema.users)
    .where(and(...conds))
    .orderBy(asc(schema.users.displayName))
    .limit(1000);
}

export async function getUserForAdmin(actor: Actor, id: string) {
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!u) throw notFound();
  if (!isAdmin(actor)) throw forbidden();
  const [classes, teaching, activity] = await Promise.all([
    db.select({ id: schema.classes.id, name: schema.classes.name }).from(schema.classStudents).innerJoin(schema.classes, eq(schema.classes.id, schema.classStudents.classId)).where(eq(schema.classStudents.studentId, id)),
    db
      .select({ id: schema.classTeachers.id, classId: schema.classes.id, className: schema.classes.name, subjectId: schema.classTeachers.subjectId, subjectName: schema.subjects.name })
      .from(schema.classTeachers)
      .innerJoin(schema.classes, eq(schema.classes.id, schema.classTeachers.classId))
      .leftJoin(schema.subjects, eq(schema.subjects.id, schema.classTeachers.subjectId))
      .where(eq(schema.classTeachers.teacherId, id)),
    db.execute<{ created: number; graded: number; feedback: number }>(sql`
      select (select count(*)::int from assignments where created_by = ${id}) as created,
        (select count(*)::int from grade_history where changed_by = ${id} and changed_at > now() - interval '30 days') as graded,
        (select count(*)::int from feedback where author_id = ${id} and created_at > now() - interval '30 days') as feedback`),
  ]);
  const { passwordHash: _ph, ...safe } = u;
  void _ph;
  return { user: safe, classes, teaching, activity: activity[0] };
}

/** A student's academic record for authorised staff (admins, or teachers of the student's classes). */
export async function studentRecord(actor: Actor, studentId: string) {
  if (!(await canViewStudent(actor, studentId)) || actor.id === studentId) throw forbidden();
  const [u] = await db
    .select({ id: schema.users.id, displayName: schema.users.displayName, username: schema.users.username, studentCode: schema.users.studentCode, status: schema.users.status, createdAt: schema.users.createdAt, lastLoginAt: schema.users.lastLoginAt })
    .from(schema.users)
    .where(and(eq(schema.users.id, studentId), eq(schema.users.role, "student")));
  if (!u) throw notFound();
  const scope = await manageableClassIds(actor);
  const grades = await db.execute<{ assignment_id: string; title: string; subject: string; points: string; max_points: string; percent: string; status: "provisional" | "final"; scale_label: string; graded_at: string }>(sql`
    select g.points, g.max_points, g.percent, g.status, g.scale_label, g.graded_at, a.id as assignment_id, a.title, s.name as subject
    from grades g join assignments a on a.id = g.assignment_id join subjects s on s.id = a.subject_id
    where g.student_id = ${studentId}
      ${scope === "all" ? sql`` : sql`and exists (select 1 from class_teachers ct where ct.teacher_id = ${actor.id} and (ct.subject_id is null or ct.subject_id = a.subject_id) and ct.class_id in (select class_id from class_students where student_id = ${studentId}))`}
    order by g.graded_at desc limit 200`);
  const classes = await db.select({ name: schema.classes.name }).from(schema.classStudents).innerJoin(schema.classes, eq(schema.classes.id, schema.classStudents.classId)).where(eq(schema.classStudents.studentId, studentId));
  return { user: u, classes, grades };
}

// ─── Own profile ─────────────────────────────────────────────────────────────

const profileInput = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  avatarFileId: z.string().uuid().nullable().optional(),
  notificationPrefs: z.record(z.string(), z.boolean()).optional(),
  weeklyTaskGoal: z.coerce.number().int().min(1).max(100).optional(),
  dailyXpGoal: z.coerce.number().int().min(5).max(1000).optional(),
  dailyGoal: z.coerce.number().int().min(1).max(20).optional(),
  gamificationEnabled: z.boolean().optional(),
});

export async function updateOwnProfile(actor: Actor, input: unknown) {
  const v = profileInput.parse(input);
  const settings = await getSettings();
  const isStudent = actor.role === "student";
  if (v.displayName !== undefined && isStudent && !settings.profile.studentsCanEditDisplayName) throw forbidden("Ismni faqat administrator o‘zgartira oladi.");
  if (v.avatarFileId !== undefined && isStudent && !settings.profile.studentsCanEditAvatar) throw forbidden("Rasmni faqat administrator o‘zgartira oladi.");
  if (v.avatarFileId) await assertOwnFiles(actor.id, [v.avatarFileId]);
  await db
    .update(schema.users)
    .set({ ...v, updatedAt: new Date() })
    .where(eq(schema.users.id, actor.id));
}

export async function ownProfile(userId: string) {
  const [u] = await db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      email: schema.users.email,
      role: schema.users.role,
      studentCode: schema.users.studentCode,
      avatarFileId: schema.users.avatarFileId,
      notificationPrefs: schema.users.notificationPrefs,
      weeklyTaskGoal: schema.users.weeklyTaskGoal,
      dailyXpGoal: schema.users.dailyXpGoal,
      dailyGoal: schema.users.dailyGoal,
      gamificationEnabled: schema.users.gamificationEnabled,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return u;
}

export async function recentAudit(actor: Actor, f: { q?: string; limit?: number } = {}) {
  if (!isAdmin(actor)) throw forbidden();
  const like = f.q ? "%" + f.q.replace(/[%_\\]/g, "\\$&") + "%" : null;
  return db
    .select({ id: schema.auditLogs.id, action: schema.auditLogs.action, entityType: schema.auditLogs.entityType, entityId: schema.auditLogs.entityId, meta: schema.auditLogs.meta, createdAt: schema.auditLogs.createdAt, actor: schema.users.displayName })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.actorId))
    .where(like ? or(ilike(schema.auditLogs.action, like), ilike(schema.users.displayName, like)) : sql`true`)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(Math.min(500, f.limit ?? 200));
}
