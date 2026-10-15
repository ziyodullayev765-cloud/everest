"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, UnauthorizedError } from "@/lib/auth";
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
