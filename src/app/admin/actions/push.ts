"use server";

import { z } from "zod";
import { requireAdmin, UnauthorizedError } from "@/lib/auth";
import { isPushConfigured, sendPushToAdmins } from "@/lib/push";
import type { ActionResult } from "@/lib/types";

const subscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

function fail(e: unknown): ActionResult<never> {
  if (e instanceof UnauthorizedError) return { ok: false, error: e.message };
  console.error("[admin/push] failed:", e);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** Saves this device's push subscription for the signed-in admin. */
export async function savePushSubscription(input: unknown, userAgent: string): Promise<ActionResult> {
  try {
    const parsed = subscriptionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid subscription." };
    const { supabase, user } = await requireAdmin();
    const { endpoint, keys } = parsed.data;
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: userAgent.slice(0, 400) },
        { onConflict: "endpoint" },
      );
    if (error) throw error;
    return { ok: true, message: "Notifications are on for this device." };
  } catch (e) {
    return fail(e);
  }
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw error;
    return { ok: true, message: "Notifications are off for this device." };
  } catch (e) {
    return fail(e);
  }
}

export async function sendTestPush(): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!isPushConfigured()) return { ok: false, error: "Push is not configured on the server yet." };
    const delivered = await sendPushToAdmins({
      title: "Test notification",
      body: "Notifications work. New contact messages will appear like this.",
      url: "/admin/messages",
      tag: "test",
    });
    return delivered
      ? { ok: true, message: `Sent to ${delivered} device${delivered === 1 ? "" : "s"}.` }
      : { ok: false, error: "No device received it. Turn notifications on first." };
  } catch (e) {
    return fail(e);
  }
}
