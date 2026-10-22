import "server-only";
import "@/server/locale";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "../db";
import { randomToken, sha256 } from "../crypto";
import { env } from "../env";
import { AppError, forbidden } from "../errors";
import type { Role } from "../db/schema";
import { tr } from "@/lib/i18n/tr";

const SESSION_DAYS = 14;
const TOUCH_AFTER_MS = 60 * 60 * 1000;

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-learn_session" : "learn_session";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  permissions: string[];
  mustChangePassword: boolean;
  avatarFileId: string | null;
  locale: string;
  gamificationEnabled: boolean;
};

export async function createSession(userId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  await db.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt, userAgent: ua });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  // Opportunistic cleanup of expired sessions.
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

/** The signed-in user for this request, or null. Deactivated users are treated as signed out. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const id = sha256(token);
  const rows = await db
    .select({
      sessionId: schema.sessions.id,
      lastSeenAt: schema.sessions.lastSeenAt,
      id: schema.users.id,
      username: schema.users.username,
      displayName: schema.users.displayName,
      role: schema.users.role,
      status: schema.users.status,
      permissions: schema.users.permissions,
      mustChangePassword: schema.users.mustChangePassword,
      avatarFileId: schema.users.avatarFileId,
      locale: schema.users.locale,
      gamificationEnabled: schema.users.gamificationEnabled,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || row.status !== "active") return null;
  if (Date.now() - row.lastSeenAt.getTime() > TOUCH_AFTER_MS) {
    await db
      .update(schema.sessions)
      .set({ lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000) })
      .where(eq(schema.sessions.id, id));
  }
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    permissions: row.permissions,
    mustChangePassword: row.mustChangePassword,
    avatarFileId: row.avatarFileId,
    locale: row.locale,
    gamificationEnabled: row.gamificationEnabled,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new AppError("unauthenticated", tr("Iltimos, tizimga kiring."));
  return u;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const u = await requireUser();
  if (!roles.includes(u.role)) throw forbidden();
  return u;
}
