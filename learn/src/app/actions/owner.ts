"use server";
import { revalidatePath } from "next/cache";
import { run } from "@/server/action";
import { requireUser } from "@/server/auth/session";
import { ownerAddXp, ownerRemoveBonus, ownerSetAchievement } from "@/server/services/owner";

const done = () => revalidatePath("/", "layout");

export async function ownerSetAchievementAction(code: string, on: boolean) {
  return run(async () => (await ownerSetAchievement(await requireUser(), code, on), done()));
}
export async function ownerAddXpAction(input: { amount: number; note: string }) {
  return run(async () => (await ownerAddXp(await requireUser(), input), done()));
}
export async function ownerRemoveBonusAction(id: string) {
  return run(async () => (await ownerRemoveBonus(await requireUser(), id), done()));
}
