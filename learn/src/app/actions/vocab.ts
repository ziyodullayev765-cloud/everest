"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { evaluateAchievements } from "@/server/services/achievements";
import { run } from "@/server/action";
import { afterImport, previewImport, revertImport, runImport } from "@/server/services/vocab-import";
import { requireRole } from "@/server/auth/session";
import {
  finishGame,
  bulkWordLists,
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
    const u = await student();
    const r = await recordReview(u, input);
    // Word-count achievements; checked after the response so reviews stay fast.
    after(() => evaluateAchievements(u.id).catch(() => {}));
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
    const u = await student();
    const r = await finishGame(u, input);
    await evaluateAchievements(u.id);
    revalidatePath("/", "layout");
    return r;
  });
}

export async function previewImportAction(input: unknown) {
  return run(async () => previewImport(await staff(), input));
}
export async function runImportAction(input: unknown) {
  return run(async () => {
    const r = await runImport(await staff(), input);
    after(() => afterImport(r).catch((e) => console.error("[import notify]", e)));
    refresh();
    return { jobId: r.jobId, listId: r.listId };
  });
}
export async function revertImportAction(id: string) {
  return run(async () => {
    const r = await revertImport(await staff(), id);
    refresh();
    return r;
  });
}
export async function bulkWordListsAction(input: unknown) {
  return run(async () => {
    const r = await bulkWordLists(await staff(), input);
    refresh();
    return r;
  });
}
