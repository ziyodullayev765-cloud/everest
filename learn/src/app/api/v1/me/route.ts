import { json } from "@/server/http";
import { requireUser } from "@/server/auth/session";

/** GET /api/v1/me — the signed-in user (session cookie). */
export async function GET() {
  return json(async () => {
    const u = await requireUser();
    return { id: u.id, username: u.username, displayName: u.displayName, role: u.role, locale: u.locale };
  });
}
