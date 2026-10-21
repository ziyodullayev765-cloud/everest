import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { AppError } from "../errors";

/**
 * Fixed-window limiter stored in Postgres so it holds across serverless instances.
 * Returns the count in the current window after incrementing.
 */
export async function hit(key: string, windowSeconds: number): Promise<number> {
  const rows = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then now() else rate_limits.window_start end
    returning count`);
  return Number(rows[0]?.count ?? 1);
}

export async function enforce(key: string, limit: number, windowSeconds: number) {
  if ((await hit(key, windowSeconds)) > limit) {
    throw new AppError("rate_limited", "Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring.");
  }
}

export async function reset(key: string) {
  await db.execute(sql`delete from rate_limits where key = ${key}`);
}
