import "server-only";
import { headers } from "next/headers";
import { db, schema, type Executor } from "../db";
import { keyedHash } from "../crypto";

export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  meta: Record<string, unknown> = {},
  tx: Executor = db,
) {
  const ip = await clientIp();
  await tx.insert(schema.auditLogs).values({ actorId, action, entityType, entityId, meta, ipHash: keyedHash(ip) });
}
