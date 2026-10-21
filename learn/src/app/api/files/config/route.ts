import { json } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { blobEnabled, blobMaxBytes, blobPrefix } from "@/server/services/files";
import { env } from "@/server/env";

/** GET /api/files/config — how this user should upload (direct-to-storage for big files when configured). */
export async function GET() {
  return json(async () => {
    const u = await requireUser();
    return blobEnabled() ? { mode: "blob" as const, prefix: blobPrefix(u), maxBytes: blobMaxBytes(u) } : { mode: "db" as const, maxBytes: env.maxUploadBytes };
  });
}
