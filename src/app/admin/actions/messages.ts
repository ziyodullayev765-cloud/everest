"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, UnauthorizedError } from "@/lib/auth";
import { isMailerConfigured, sendMail } from "@/lib/mailer";
import { ownerName } from "@/lib/defaults";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/types";

const uuid = z.string().uuid();
const statusSchema = z.enum(["new", "read", "archived"]);

function fail(e: unknown): ActionResult<never> {
  if (e instanceof UnauthorizedError) return { ok: false, error: e.message };
  console.error("[admin/messages] failed:", e);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function setMessageStatus(id: string, status: "new" | "read" | "archived"): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(id).success || !statusSchema.safeParse(status).success) return { ok: false, error: "Invalid request." };
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  try {
    if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid request." };
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Message deleted." };
  } catch (e) {
    return fail(e);
  }
}

const replySchema = z.object({
  id: uuid,
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(2, "Write a reply first.").max(10_000, "The reply is too long."),
});

/**
 * E-mails a reply to the person who sent a contact message. The recipient is
 * always the address stored with that message, never one sent from the browser,
 * so this cannot be used to mail arbitrary people.
 */
export async function replyToMessage(input: { id: string; subject: string; body: string }): Promise<ActionResult> {
  try {
    const parsed = replySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
    const { supabase, user } = await requireAdmin();
    if (!isMailerConfigured()) return { ok: false, error: "E-mail sending is not set up yet." };
    if (!rateLimit(`reply:${user.id}`, 30, 60 * 60_000))
      return { ok: false, error: "Too many replies in a short time. Try again later." };

    const { data: msg, error } = await supabase
      .from("contact_messages")
      .select("id, email, name")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (error) throw error;
    if (!msg) return { ok: false, error: "Message not found." };

    const [{ data: profile }, { data: settings }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", 1).maybeSingle(),
      supabase.from("site_settings").select("site_name").eq("id", 1).maybeSingle(),
    ]);
    try {
      await sendMail({
        to: msg.email as string,
        subject: parsed.data.subject,
        text: parsed.data.body,
        fromName: ownerName(profile ?? {}, settings ?? {}),
      });
    } catch (e) {
      console.error("[admin/messages] send failed:", e);
      return { ok: false, error: "The e-mail could not be sent. Check the SMTP settings and try again." };
    }

    await supabase
      .from("contact_messages")
      .update({ status: "read", replied_at: new Date().toISOString() })
      .eq("id", msg.id as string);
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Reply sent to ${msg.email}.` };
  } catch (e) {
    return fail(e);
  }
}
