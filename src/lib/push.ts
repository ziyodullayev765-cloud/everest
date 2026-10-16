import "server-only";
import webpush from "web-push";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Web Push to the administrators' devices (new contact messages, tests).
 *
 * Needs, on the server only: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
 * PUSH_SECRET (its SHA-256 hash lives in public.push_config) and optionally
 * VAPID_SUBJECT. Without them push is simply off.
 */
export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function isPushConfigured() {
  return Boolean(isSupabaseConfigured && vapidPublicKey && process.env.VAPID_PRIVATE_KEY && process.env.PUSH_SECRET);
}

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    vapidPublicKey,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

/** Sends to every admin subscription; prunes ones the push service says are gone. Returns how many were delivered. */
export async function sendPushToAdmins(payload: PushPayload): Promise<number> {
  if (!isPushConfigured()) return 0;
  configure();
  const secret = process.env.PUSH_SECRET!;
  const db = createPublicClient();
  const { data, error } = await db.rpc("push_targets", { p_secret: secret });
  if (error) {
    console.error("[push] could not load subscriptions:", error.code, error.message);
    return 0;
  }
  const subs = (data ?? []) as { endpoint: string; p256dh: string; auth: string }[];
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
        TTL: 60 * 60 * 24,
        urgency: "high",
        timeout: 8000,
      }),
    ),
  );
  let delivered = 0;
  await Promise.all(
    results.map(async (r, i) => {
      if (r.status === "fulfilled") {
        delivered++;
        return;
      }
      const status = (r.reason as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await db.rpc("push_forget", { p_secret: secret, p_endpoint: subs[i]!.endpoint });
      } else {
        console.error("[push] delivery failed:", status ?? r.reason);
      }
    }),
  );
  return delivered;
}
