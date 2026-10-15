"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { copy } from "@/lib/copy";
import { isSupabaseConfigured } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/server";
import { contactSchema, MIN_FILL_MS } from "@/lib/validation/contact";
import { flattenErrors } from "@/lib/cms/fields";
import type { ActionResult } from "@/lib/types";

function hashIp(ip: string) {
  const salt = process.env.CONTACT_IP_SALT || "portfolio-contact";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function submitContact(input: {
  name: string;
  email: string;
  subject?: string;
  message: string;
  website?: string;
  startedAt?: number;
}): Promise<ActionResult> {
  // Honeypot: real users never see or fill this field. Pretend success for bots.
  if (input.website) return { ok: true };
  // Time trap: humans need a few seconds to fill the form.
  if (typeof input.startedAt !== "number" || Date.now() - input.startedAt < MIN_FILL_MS) {
    return { ok: true };
  }

  const parsed = contactSchema.safeParse({ ...input, subject: input.subject ?? "" });
  if (!parsed.success) return { ok: false, error: copy.contact.errorGeneric, fieldErrors: flattenErrors(parsed.error) };

  if (!isSupabaseConfigured) return { ok: false, error: copy.contact.errorConfig };

  const h = await headers();
  const ip = clientIp(h);
  if (!rateLimit(`contact:${ip}`, 3, 10 * 60_000)) return { ok: false, error: copy.contact.errorRate };

  try {
    const db = createPublicClient();
    const { error } = await db.rpc("submit_contact_message", {
      p_name: parsed.data.name,
      p_email: parsed.data.email,
      p_subject: parsed.data.subject ?? "",
      p_message: parsed.data.message,
      p_ip_hash: hashIp(ip),
      p_user_agent: (h.get("user-agent") ?? "").slice(0, 400),
    });
    if (error) {
      if (error.message?.includes("rate_limited")) return { ok: false, error: copy.contact.errorRate };
      console.error("[contact] rpc error:", error.code, error.message);
      return { ok: false, error: copy.contact.errorGeneric };
    }
    return { ok: true, message: copy.contact.success };
  } catch (err) {
    console.error("[contact] failed:", err);
    return { ok: false, error: copy.contact.errorGeneric };
  }
}
