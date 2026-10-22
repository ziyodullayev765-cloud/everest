import { getCurrentUser } from "@/server/auth/session";
import { json, assertSameOrigin } from "@/server/http";
import { AppError } from "@/server/errors";
import { registerBlob } from "@/server/services/files";
import { tr } from "@/lib/i18n/tr";

/** POST { pathname, name, visibility?, imagesOnly? } — verifies a direct upload and records it. */
export async function POST(req: Request) {
  return json(async () => {
    assertSameOrigin(req);
    const user = await getCurrentUser();
    if (!user) throw new AppError("unauthenticated", tr("Tizimga kiring."));
    const b = (await req.json().catch(() => ({}))) as { pathname?: string; name?: string; visibility?: string; imagesOnly?: boolean };
    return registerBlob(user, { pathname: String(b.pathname ?? ""), name: String(b.name ?? "") }, { visibility: b.visibility === "public" ? "public" : "private", imagesOnly: !!b.imagesOnly });
  });
}
