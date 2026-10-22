import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";

/** Cloud region in the database host name (e.g. "eu-central-1"); never the host itself. */
function dbRegion(url = env.databaseUrl) {
  try {
    const host = new URL(url).hostname;
    return /\b((?:us|eu|ap|sa|ca|me|af)-[a-z]+-\d)\b/.exec(host)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Liveness + database reachability and round-trip time. No sensitive details. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    const t = performance.now();
    await db.execute(sql`select 1`);
    const dbMs = Math.round(performance.now() - t);
    return NextResponse.json({ ok: true, db: "up", dbMs, region: process.env.VERCEL_REGION ?? null, dbRegion: dbRegion(), ...(process.env.NEW_DATABASE_URL ? { newDbRegion: dbRegion(process.env.NEW_DATABASE_URL) } : {}) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
