"use server";
import { revalidatePath } from "next/cache";
import { run } from "@/server/action";
import { requireRole } from "@/server/auth/session";
import {
  finishGame,
  importWords,
  recordReview,
  removeWord,
  saveWord,
  saveWordList,
  sessionCards,
  setVocabGoal,
  setWordFlag,
  setWordListStatus,
  setWordListTargets,
  type SessionMode,
} from "@/server/services/vocabulary";

const staff = () => requireRole("teacher", "admin", "super_admin");
const student = () => requireRole("student");
const refresh = () => revalidatePath("/", "layout");

export async function saveWordListAction(id: string | null, input: unknown) {
  return run(async () => {
    const r = await saveWordList(await staff(), id, input);
    refresh();
    return { id: r };
  });
}
export async function wordListStatusAction(id: string, status: "draft" | "published" | "archived") {
  return run(async () => {
    await setWordListStatus(await staff(), id, status);
    refresh();
  });
}
export async function saveWordAction(listId: string, wordId: string | null, input: unknown) {
  return run(async () => {
    await saveWord(await staff(), listId, wordId, input);
    refresh();
  });
}
export async function removeWordAction(listId: string, wordId: string) {
  return run(async () => {
    await removeWord(await staff(), listId, wordId);
    refresh();
  });
}
export async function importWordsAction(listId: string, text: string, swap = false) {
  return run(async () => {
    const r = await importWords(await staff(), listId, text, !!swap);
    if (r.added) refresh();
    return r;
  });
}
export async function wordListTargetsAction(listId: string, input: { classIds: string[]; studentIds: string[] }) {
  return run(async () => {
    await setWordListTargets(await staff(), listId, input);
    refresh();
  });
}

export async function sessionCardsAction(mode: SessionMode, listId: string | null) {
  return run(async () => sessionCards(await student(), { mode, listId }));
}
export async function recordReviewAction(input: unknown) {
  return run(async () => {
    const r = await recordReview(await student(), input);
    return { ...r, dueAt: r.dueAt.toISOString() };
  });
}
export async function wordFlagAction(wordId: string, flag: "favorite" | "difficult", on: boolean) {
  return run(async () => {
    await setWordFlag(await student(), wordId, flag, on);
    revalidatePath("/vocabulary", "layout");
  });
}
export async function vocabGoalAction(n: number) {
  return run(async () => {
    await setVocabGoal(await student(), n);
    revalidatePath("/vocabulary", "layout");
  });
}
export async function finishGameAction(input: unknown) {
  return run(async () => {
    const r = await finishGame(await student(), input);
    revalidatePath("/", "layout");
    return r;
  });
}
