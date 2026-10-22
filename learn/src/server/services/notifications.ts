import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema, type Executor } from "../db";

export const NOTIFICATION_TYPES = {
  new_assignment: "Yangi vazifalar va quizlar",
  deadline: "Muddat yaqinlashganda eslatma",
  submission: "Topshirilgan ishlar (o‘qituvchilar uchun)",
  grade: "E’lon qilingan baholar",
  feedback: "O‘qituvchi izohlari",
  weekly_summary: "Haftalik hisobot",
  announcement: "Guruh e’lonlari",
  system: "Tizim xabarlari",
} as const;
export type NotificationType = keyof typeof NOTIFICATION_TYPES;

type Payload = { type: NotificationType; title: string; body?: string; link?: string; dedupeKey?: string };

/**
 * Creates in-app notifications, honouring each user's preferences ("system" cannot be disabled).
 * Duplicate events are dropped through the (user_id, dedupe_key) unique index.
 * E-mail/push delivery is intentionally not wired: see README → Notifications.
 */
export async function notify(userIds: string[], p: Payload, ex: Executor = db) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return 0;
  const users = await ex
    .select({ id: schema.users.id, prefs: schema.users.notificationPrefs })
    .from(schema.users)
    .where(and(inArray(schema.users.id, ids), eq(schema.users.status, "active")));
  const recipients = users.filter((u) => p.type === "system" || u.prefs?.[p.type] !== false);
  if (recipients.length === 0) return 0;
  const rows = await ex
    .insert(schema.notifications)
    .values(recipients.map((u) => ({ userId: u.id, type: p.type, title: p.title.slice(0, 200), body: (p.body ?? "").slice(0, 1000), link: p.link ?? null, dedupeKey: p.dedupeKey ?? null })))
    .onConflictDoNothing()
    .returning({ id: schema.notifications.id });
  return rows.length;
}

export async function listNotifications(userId: string, limit = 50) {
  return db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)).orderBy(desc(schema.notifications.createdAt)).limit(limit);
}

export async function unreadCount(userId: string) {
  const r = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.notifications)
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
  return r[0]?.n ?? 0;
}

export async function markRead(userId: string, id?: string) {
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt), id ? eq(schema.notifications.id, id) : sql`true`));
}

/** Staff responsible for a student on an assignment: admins are not spammed; class teachers are. */
export async function teachersFor(assignmentId: string, studentId: string, ex: Executor = db): Promise<string[]> {
  const rows = await ex.execute<{ teacher_id: string }>(sql`
    select distinct ct.teacher_id
    from class_teachers ct
    join class_students cs on cs.class_id = ct.class_id and cs.student_id = ${studentId}
    join assignments a on a.id = ${assignmentId}
    join users u on u.id = ct.teacher_id and u.status = 'active'
    where ct.subject_id is null or ct.subject_id = a.subject_id
    union
    select a.created_by from assignments a join users u on u.id = a.created_by
    where a.id = ${assignmentId} and u.role = 'teacher' and u.status = 'active'`);
  return rows.map((r) => r.teacher_id);
}
