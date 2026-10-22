import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, db, schema } from "@/server/db";
import { saveAssignment, saveQuestions, setAssignmentStatus, subjectsList } from "@/server/services/assignments";
import { attemptResult, attemptView, saveAnswer, startAttempt, submitAttempt } from "@/server/services/quiz";
import { studentDashboard, studentResults } from "@/server/services/analytics";
import {
  finishGame,
  gameCards,
  getWordList,
  glossaryFor,
  importWords,
  listActivity,
  recordReview,
  removeWord,
  saveWord,
  saveWordList,
  sessionCards,
  setWordFlag,
  setWordListStatus,
  setWordListTargets,
  vocabOverview,
} from "@/server/services/vocabulary";
import { askTutor, tutorEnabled } from "@/server/services/tutor";
import { authorizeFileRead, storeFile } from "@/server/services/files";
import { localDay } from "@/lib/dates";
import { addDays } from "@/lib/gamification";
import { baseAssignment, makeSubject, world } from "./fixtures";

afterAll(async () => closeDb());

const err = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as { code?: string; message: string };
  }
  throw new Error("expected rejection");
};

describe("English categories", () => {
  it("lists only the fixed English categories, in course order", async () => {
    const cats = await subjectsList();
    expect(cats.map((c) => c.code).slice(0, 3)).toEqual(["GRAMMAR", "VOCAB", "TR_EN_UZ"]);
    expect(cats.some((c) => c.code === "MATH")).toBe(false);
  });
});

describe("vocabulary lists and spaced repetition", () => {
  async function setup() {
    const w = await world();
    const listId = await saveWordList(w.teacher, null, { title: "Travel", level: "B1" });
    const r = await importWords(w.teacher, listId, "english,uzbek,example\njourney,\"sayohat, safar\",It was a long journey.\nluggage,yuk,\npassport,pasport,\nJourney,sayohat,\n");
    expect(r).toMatchObject({ added: 3, duplicates: ["Journey"], errors: [] });
    await setWordListTargets(w.teacher, listId, { classIds: [w.cls.id], studentIds: [] });
    return { w, listId };
  }

  it("word pictures and pronunciation are playable by the students the list is published to", async () => {
    const { w, listId } = await setup();
    const audio = await storeFile(w.teacher, new File([Buffer.concat([Buffer.from("ID3"), Buffer.alloc(300, 7)])], "journey.mp3", { type: "audio/mpeg" }));
    await saveWord(w.teacher, listId, null, { english: "ticket", uzbek: "chipta", audioFileId: audio.id });
    await expect(authorizeFileRead(w.student, audio.id)).rejects.toThrow(); // not published yet
    await setWordListStatus(w.teacher, listId, "published");
    await expect(authorizeFileRead(w.student, audio.id)).resolves.toBeTruthy();
    await expect(authorizeFileRead(w.otherStudent, audio.id)).rejects.toThrow();
  });

  it("is invisible until published, and only to the targeted group", async () => {
    const { w, listId } = await setup();
    expect((await vocabOverview(w.student)).lists).toHaveLength(0);
    await setWordListStatus(w.teacher, listId, "published");
    expect((await vocabOverview(w.student)).lists.map((l) => l.id)).toEqual([listId]);
    expect((await vocabOverview(w.otherStudent)).lists).toHaveLength(0);
    const n = await db.execute<{ n: number }>(sql`select count(*)::int as n from notifications where user_id = ${w.student.id} and type = 'vocabulary'`);
    expect(n[0].n).toBe(1);
    // Students can't review words that weren't assigned to them.
    const word = (await getWordList(w.teacher, listId)).words[0];
    expect((await err(recordReview(w.otherStudent, { wordId: word.id, kind: "typing", response: "journey" }))).code).toBe("not_found");
  });

  it("checks answers on the server, schedules reviews and records history", async () => {
    const { w, listId } = await setup();
    await setWordListStatus(w.teacher, listId, "published");
    const cards = await sessionCards(w.student, { mode: "daily" });
    expect(cards).toHaveLength(3);
    expect(cards.every((c) => c.isNew)).toBe(true);
    const journey = cards.find((c) => c.english === "journey")!;

    const ok = await recordReview(w.student, { wordId: journey.id, kind: "typing", response: "Journey." });
    expect(ok).toMatchObject({ correct: true, state: "review", intervalDays: 1 });
    const choice = await recordReview(w.student, { wordId: cards.find((c) => c.english === "luggage")!.id, kind: "choice", response: "pasport" });
    expect(choice.correct).toBe(false);
    await recordReview(w.student, { wordId: cards.find((c) => c.english === "passport")!.id, kind: "flashcard", grade: 3 });

    const o = await vocabOverview(w.student);
    expect(o.totals).toMatchObject({ words: 3, learned: 2, mastered: 0, newAvailable: 0, reviewedToday: 3 });
    // The missed word is due again soon; the learned ones are not due now.
    expect((await sessionCards(w.student, { mode: "review" })).map((c) => c.english)).toEqual([]);
    await db.execute(sql`update vocab_progress set due_at = now() - interval '1 minute' where student_id = ${w.student.id} and reps = 0`);
    expect((await sessionCards(w.student, { mode: "review" })).map((c) => c.english)).toEqual(["luggage"]);

    // History is append-only.
    const blocked = await err(db.execute(sql`update vocab_reviews set correct = true where student_id = ${w.student.id}`));
    expect(String((blocked as { cause?: { message?: string } }).cause?.message ?? blocked.message)).toMatch(/append-only/);

    // Flags and activity for the teacher.
    await setWordFlag(w.student, journey.id, "difficult", true);
    expect((await sessionCards(w.student, { mode: "difficult" })).map((c) => c.english).sort()).toEqual(["journey", "luggage"]);
    const act = await listActivity(w.teacher, listId);
    expect(act).toHaveLength(1);
    expect(act[0]).toMatchObject({ learned: 2, reviews: 3, correct: 2, accuracy: 67 });
    expect(await listActivity(w.outsiderTeacher, listId)).toHaveLength(0);

    // Dashboard and progress reflect real reviews.
    const d = await studentDashboard(w.student.id, 5, 3);
    expect(d.stats.vocabLearned).toBe(2);
    expect(d.week[6].words).toBe(3);
    const today = localDay(new Date());
    const r = await studentResults(w.student.id, { from: addDays(today, -6), to: today });
    expect(r.vocab).toMatchObject({ reviews: 3, correct: 2, learned: 2 });

    // A studied word is archived, not deleted.
    await removeWord(w.teacher, listId, journey.id);
    const [row] = await db.select().from(schema.words).where(sql`id = ${journey.id}`);
    expect(row.archivedAt).not.toBeNull();
  });

  it("only the author or an admin edits a list; duplicates are rejected", async () => {
    const { w, listId } = await setup();
    expect((await err(saveWord(w.outsiderTeacher, listId, null, { english: "x", uzbek: "y" }))).code).toBe("forbidden");
    expect((await err(saveWord(w.teacher, listId, null, { english: "LUGGAGE", uzbek: "y" }))).code).toBe("invalid");
    await saveWord(w.admin, listId, null, { english: "ticket", uzbek: "chipta" });
    expect((await err(setWordListTargets(w.outsiderTeacher, listId, { classIds: [w.cls.id], studentIds: [] }))).code).toBe("not_found");
  });

  it("glossary picks the student's own words out of a reading text", async () => {
    const { w, listId } = await setup();
    await setWordListStatus(w.teacher, listId, "published");
    const g = await glossaryFor(w.student.id, "Check your passport before the journey.");
    expect(g.map((x) => x.english).sort()).toEqual(["journey", "passport"]);
    expect(await glossaryFor(w.otherStudent.id, "passport")).toEqual([]);
  });
});

describe("English question types through the quiz engine", () => {
  it("scores arrange-words, grammar correction, irregular verbs and translation; hides keys until review", async () => {
    const w = await world();
    const grammar = await makeSubject("GRAMMAR");
    const { id } = await saveAssignment(w.teacher, null, baseAssignment(grammar.id, [w.cls.id], { type: "timed_quiz", publishMode: "draft", timeLimitMinutes: 10, topic: "Present Perfect", level: "B1" }));
    await saveQuestions(w.teacher, id, [
      { type: "arrange_words", prompt: "Order", points: 2, words: ["I", "have", "been", "there"] },
      { type: "grammar_correction", prompt: "Fix", points: 2, incorrect: "She have gone.", accepted: [["She has gone"]] },
      { type: "irregular_verb", prompt: "Forms", points: 2, base: "go", accepted: [["went"], ["gone"]] },
      { type: "translation", prompt: "Men talabaman.", points: 2, direction: "uz_en", accepted: [["I am a student"]] },
    ]);
    await setAssignmentStatus(w.teacher, id, "publish");
    const { attemptId } = await startAttempt(w.student, id);
    const v = await attemptView(w.student, attemptId);
    const by = (t: string) => v.questions.find((q) => q.type === t)!;
    const arrange = by("arrange_words");
    expect([...arrange.tokens].sort()).toEqual(["I", "been", "have", "there"]);
    expect(arrange.tokens.join(" ")).not.toBe("I have been there");
    expect(JSON.stringify(v.questions)).not.toContain("She has gone");
    expect(by("grammar_correction").incorrect).toBe("She have gone.");
    expect(by("irregular_verb")).toMatchObject({ base: "go", blanks: 2 });

    await saveAnswer(w.student, attemptId, arrange.id, { text: "I have been there." });
    await saveAnswer(w.student, attemptId, by("grammar_correction").id, { text: "she has gone" });
    await saveAnswer(w.student, attemptId, by("irregular_verb").id, { blanks: ["went", "goed"] });
    await saveAnswer(w.student, attemptId, by("translation").id, { text: "I am student" });
    await submitAttempt(w.student, attemptId);
    const r = await attemptResult(w.student, attemptId);
    expect(Number(r.score)).toBe(5);
    expect(r.maxScore).toBe(8);
    expect(r.history).toHaveLength(1);
  });
});

describe("AI tutor", () => {
  it("is off without a server key and refuses requests", async () => {
    const w = await world();
    expect(tutorEnabled()).toBe(!!process.env.ANTHROPIC_API_KEY);
    if (!process.env.ANTHROPIC_API_KEY) expect((await err(askTutor(w.student, { kind: "grammar", text: "Present Perfect?" }))).code).toBe("unavailable");
    expect((await err(askTutor(w.teacher, { kind: "grammar", text: "x" }))).code).toBe("forbidden");
  });
});

describe("vocabulary game", () => {
  it("scores on the server, keeps personal bests and never skips spaced repetition", async () => {
    const w = await world();
    const listId = await saveWordList(w.teacher, null, { title: "Game" });
    await importWords(w.teacher, listId, "book - kitob\npen - ruchka\ncat - mushuk\ndog - it");
    await setWordListStatus(w.teacher, listId, "published");
    await setWordListTargets(w.teacher, listId, { classIds: [w.cls.id], studentIds: [] });
    const cards = await gameCards(w.student, listId);
    expect(cards).toHaveLength(4);
    for (const c of cards) {
      expect(c.options).toContain(c.answer);
      expect(new Set(c.options).size).toBe(c.options.length);
    }
    expect(await gameCards(w.otherStudent, listId)).toEqual([]);

    const [a, b, c] = cards;
    const r = await finishGame(w.student, { listId, answers: [{ wordId: a.id, correct: true, ms: 0 }, { wordId: b.id, correct: true, ms: 12000 }, { wordId: c.id, correct: false, ms: 3000 }] });
    // 1000 (instant) + 500 (slow) + 100 streak bonus = 1600
    expect(r).toMatchObject({ score: 1600, correct: 2, total: 3, bestStreak: 2, newBest: true });
    const again = await finishGame(w.student, { listId, answers: [{ wordId: a.id, correct: true, ms: 6000 }] });
    expect(again).toMatchObject({ score: 750, best: 1600, newBest: false });
    // The second hit on `a` was not due, so its schedule didn't move; the miss on `c` needs practice.
    const prog = await db.execute<{ word_id: string; reps: number }>(sql`select word_id, reps from vocab_progress where student_id = ${w.student.id}`);
    expect(prog.find((p) => p.word_id === a.id)?.reps).toBe(1);
    expect(prog.find((p) => p.word_id === c.id)?.reps).toBe(0);
    const n = await db.execute<{ n: number }>(sql`select count(*)::int as n from vocab_reviews where student_id = ${w.student.id} and mode = 'game'`);
    expect(n[0].n).toBe(4);
    expect((await err(finishGame(w.otherStudent, { listId, answers: [{ wordId: a.id, correct: true, ms: 1 }] }))).code).toBe("not_found");
  });
});
