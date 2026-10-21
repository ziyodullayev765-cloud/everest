import { json, assertSameOrigin } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { listNotifications, markRead, unreadCount } from "@/server/services/notifications";

/** GET /api/v1/notifications — latest 50 + unread count. POST { id? } marks one/all read. */
export async function GET() {
  return json(async () => {
    const u = await requireUser();
    const [items, unread] = await Promise.all([listNotifications(u.id), unreadCount(u.id)]);
    return { unread, items };
  });
}

export async function POST(req: Request) {
  return json(async () => {
    assertSameOrigin(req);
    const u = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { id?: unknown };
    await markRead(u.id, typeof body.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : undefined);
    return { done: true };
  });
}
