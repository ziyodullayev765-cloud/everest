"use server";
import { run } from "@/server/action";
import { requireRole } from "@/server/auth/session";
import { askTutor } from "@/server/services/tutor";

export async function askTutorAction(input: { kind: string; text: string; extra?: string }) {
  return run(async () => askTutor(await requireRole("student"), input));
}
