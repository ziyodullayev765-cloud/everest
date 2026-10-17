"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { getCopy } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";
import { sendPushToAdmins } from "@/lib/push";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  message: z.string().trim().min(2).max(280),
});

export async function signGuestbook(input: {
  name: string;
  message: string;
  website?: string;
  startedAt?: number;
}): Promise<ActionResult> {
  const copy = await getCopy();
  // Same bot traps as the contact form: a hidden field and a minimum fill time.
  if (input.website) return { ok: true, message: copy.guestbook.thanks };
  if (typeof input.startedAt !== "number" || Date.now() - input.startedAt < 2500) {
    return { ok: true, message: copy.guestbook.thanks };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: copy.guestbook.messageError };
  if (!isSupabaseConfigured) return { ok: false, error: copy.guestbook.error };

  const ip = clientIp(await headers());
  if (!rateLimit(`guestbook:${ip}`, 3, 60 * 60_000)) return { ok: false, error: copy.guestbook.rate };
  const salt = process.env.CONTACT_IP_SALT || "portfolio-contact";
  const ipHash = createHash("sha256").update(`${salt}:${ip}`).digest("hex");

  const { error } = await createPublicClient().rpc("sign_guestbook", {
    p_name: parsed.data.name,
    p_message: parsed.data.message,
    p_ip_hash: ipHash,
  });
  if (error) {
    if (error.message?.includes("rate_limited")) return { ok: false, error: copy.guestbook.rate };
    console.error("[guestbook] rpc error:", error.code, error.message);
    return { ok: false, error: copy.guestbook.error };
  }
  after(() =>
    sendPushToAdmins({
      title: `Guestbook: ${parsed.data.name}`,
      body: parsed.data.message.slice(0, 140),
      url: "/admin/guestbook",
      tag: "guestbook",
    }).catch((err) => console.error("[guestbook] push failed:", err)),
  );
  return { ok: true, message: copy.guestbook.thanks };
}
