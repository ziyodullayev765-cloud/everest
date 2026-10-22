import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, schema } from "../db";
import type { Actor } from "../auth/rbac";
import { forbidden, notFound } from "../errors";
import { audit } from "./audit";
import { awardXp } from "./gamification";

/**
 * Private section for the app owner's own account (OWNER_USERNAMES, comma-separated): lets that account
 * give itself achievements and bonus XP. It only touches the owner's own motivational data — never grades
 * or other users — and every change is still written to the audit log.
 */
export const ownerUsernames = () =>
  (process.env.OWNER_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const isOwner = (u: { username: string } | null | undefined) => !!u && ownerUsernames().includes(u.username.toLowerCase());

function requireOwner(actor: Actor & { username: string }) {
  if (!isOwner(actor)) throw notFound();
}

export async function ownerOverview(actor: Actor & { username: string }) {
  requireOwner(actor);
  const [defs, earned, xp, bonuses] = await Promise.all([
    db.select().from(schema.achievements).orderBy(schema.achievements.sortOrder),
    db.select().from(schema.userAchievements).where(eq(schema.userAchievements.userId, actor.id)),
    db.execute<{ n: number }>(sql`select coalesce(sum(amount),0)::int as n from xp_transactions where user_id = ${actor.id}`),
    db.execute<{ id: string; amount: number; reason: string; created_at: Date }>(
      sql`select id, amount, reason, created_at from xp_transactions where user_id = ${actor.id} and source_key like 'owner:%' order by created_at desc limit 20`,
    ),
  ]);
  const at = new Map(earned.map((e) => [e.code, e.earnedAt]));
  return { defs: defs.map((d) => ({ ...d, earnedAt: at.get(d.code) ?? null })), xp: xp[0]?.n ?? 0, bonuses };
}

export async function ownerSetAchievement(actor: Actor & { username: string }, code: string, on: boolean) {
  requireOwner(actor);
  const [def] = await db.select().from(schema.achievements).where(eq(schema.achievements.code, code));
  if (!def) throw notFound();
  if (on) {
    const r = await db.insert(schema.userAchievements).values({ userId: actor.id, code }).onConflictDoNothing().returning({ code: schema.userAchievements.code });
    if (r.length && def.xpReward > 0) await awardXp(actor.id, def.xpReward, "achievement", `ach:${code}:${actor.id}`);
  } else {
    await db.delete(schema.userAchievements).where(and(eq(schema.userAchievements.userId, actor.id), eq(schema.userAchievements.code, code)));
    await db.delete(schema.xpTransactions).where(eq(schema.xpTransactions.sourceKey, `ach:${code}:${actor.id}`));
  }
  await audit(actor.id, on ? "owner.achievement.grant" : "owner.achievement.revoke", "achievement", null, { code });
}

const bonusInput = z.object({ amount: z.coerce.number().int().min(-1000).max(1000).refine((n) => n !== 0, "0 bo‘lmasin"), note: z.string().trim().max(80).default("") });

export async function ownerAddXp(actor: Actor & { username: string }, raw: unknown) {
  requireOwner(actor);
  const v = bonusInput.parse(raw);
  const reason = v.note ? `owner: ${v.note}` : "owner";
  if (v.amount > 0) await awardXp(actor.id, v.amount, reason, `owner:${randomUUID()}`);
  else await db.insert(schema.xpTransactions).values({ userId: actor.id, amount: v.amount, reason, sourceKey: `owner:${randomUUID()}` });
  await audit(actor.id, "owner.xp", "user", actor.id, { amount: v.amount });
}

export async function ownerRemoveBonus(actor: Actor & { username: string }, id: string) {
  requireOwner(actor);
  const r = await db
    .delete(schema.xpTransactions)
    .where(and(eq(schema.xpTransactions.id, id), eq(schema.xpTransactions.userId, actor.id), sql`${schema.xpTransactions.sourceKey} like 'owner:%'`))
    .returning({ id: schema.xpTransactions.id });
  if (!r.length) throw forbidden();
  await audit(actor.id, "owner.xp.remove", "user", actor.id, {});
}
