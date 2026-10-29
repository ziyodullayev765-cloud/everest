import { afterAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeDb, db, schema } from "@/server/db";
import { recordReview, saveWord, saveWordList, sessionCards, setWordListStatus, setWordListTargets, studentWordList, vocabOverview, gameCards } from "@/server/services/vocabulary";
import { enroll, makeClass, makeUser, teach } from "./fixtures";

afterAll(async () => closeDb());

async function makeList(admin: Awaited<ReturnType<typeof makeUser>>, title: string, words: [string, string][]) {
  const id = await saveWordList(admin, null, { title });
  for (const [english, uzbek] of words) await saveWord(admin, id, null, { english, uzbek });
  await setWordListStatus(admin, id, "published");
  return id;
}
const visibleTitles = async (s: Awaited<ReturnType<typeof makeUser>>) => (await vocabOverview(s)).lists.map((l) => l.title).sort();

describe("group-specific vocabulary access", () => {
  it("each group sees only the sets assigned to it; shared sets reach exactly their groups", async () => {
    const admin = await makeUser("admin");
    const [A, B, C, D] = [await makeClass("A"), await makeClass("B"), await makeClass("C"), await makeClass("D")];
    const [a, b, c, d] = [await makeUser("student"), await makeUser("student"), await makeUser("student"), await makeUser("student")];
    await enroll(A.id, a.id);
    await enroll(B.id, b.id);
    await enroll(C.id, c.id);
    await enroll(D.id, d.id);
    const tag = Date.now().toString(36);
    const unit1 = await makeList(admin, `Unit 1 ${tag}`, [["apple", "olma"], ["book", "kitob"]]);
    const unit5 = await makeList(admin, `Unit 5 ${tag}`, [["journey", "sayohat"]]);
    const ielts = await makeList(admin, `IELTS ${tag}`, [["abundant", "mo‘l"]]);
    const shared = await makeList(admin, `Shared ${tag}`, [["river", "daryo"]]);
    const other = await makeList(admin, `Other ${tag}`, [["cloud", "bulut"]]);
    await setWordListTargets(admin, unit1, { classIds: [A.id], studentIds: [] });
    await setWordListTargets(admin, unit5, { classIds: [B.id], studentIds: [] });
    await setWordListTargets(admin, ielts, { classIds: [C.id], studentIds: [] });
    await setWordListTargets(admin, other, { classIds: [D.id], studentIds: [] });
    await setWordListTargets(admin, shared, { classIds: [A.id, C.id], studentIds: [] });

    expect(await visibleTitles(a)).toEqual([`Shared ${tag}`, `Unit 1 ${tag}`]);
    expect(await visibleTitles(b)).toEqual([`Unit 5 ${tag}`]);
    expect(await visibleTitles(c)).toEqual([`IELTS ${tag}`, `Shared ${tag}`]);
    expect(await visibleTitles(d)).toEqual([`Other ${tag}`]);

    // The shared set's words exist once, however many groups use it.
    const n = await db.execute<{ n: number }>(sql`select count(*)::int as n from words where list_id = ${shared}`);
    expect(n[0].n).toBe(1);

    // Direct requests for another group's set or word are refused on the server.
    await expect(studentWordList(b, unit1)).rejects.toThrow();
    const [apple] = await db.select().from(schema.words).where(eq(schema.words.listId, unit1));
    await expect(recordReview(b, { wordId: apple.id, kind: "flashcard", grade: 2 })).rejects.toThrow();
    await expect(sessionCards(b, { mode: "learn", listId: unit1 })).resolves.toEqual([]);
    expect((await gameCards(b, unit1)).length).toBe(0);
    // …while the right group can study it, and progress is per student.
    await recordReview(a, { wordId: apple.id, kind: "flashcard", grade: 2 });
    const prog = await db.select().from(schema.vocabProgress).where(eq(schema.vocabProgress.wordId, apple.id));
    expect(prog.map((p) => p.studentId)).toEqual([a.id]);

    // A student in two groups can switch between them; a group they are not in shows nothing.
    const both = await makeUser("student");
    await enroll(A.id, both.id);
    await enroll(C.id, both.id);
    expect(await visibleTitles(both)).toEqual([`IELTS ${tag}`, `Shared ${tag}`, `Unit 1 ${tag}`]);
    expect((await vocabOverview(both, A.id)).lists.map((l) => l.title).sort()).toEqual([`Shared ${tag}`, `Unit 1 ${tag}`]);
    expect((await vocabOverview(both, C.id)).lists.map((l) => l.title).sort()).toEqual([`IELTS ${tag}`, `Shared ${tag}`]);
    expect((await vocabOverview(both, B.id)).lists).toEqual([]);

    // A draft set is invisible even when assigned.
    const draft = await saveWordList(admin, null, { title: `Draft ${tag}` });
    await saveWord(admin, draft, null, { english: "secret", uzbek: "sir" });
    await setWordListTargets(admin, draft, { classIds: [A.id], studentIds: [] });
    expect(await visibleTitles(a)).not.toContain(`Draft ${tag}`);
  });

  it("leaving a group or archiving it revokes access; progress is kept", async () => {
    const admin = await makeUser("admin");
    const G = await makeClass("G");
    const s = await makeUser("student");
    await enroll(G.id, s.id);
    const list = await makeList(admin, `Revoke ${Date.now()}`, [["tree", "daraxt"]]);
    await setWordListTargets(admin, list, { classIds: [G.id], studentIds: [] });
    const [w] = await db.select().from(schema.words).where(eq(schema.words.listId, list));
    await recordReview(s, { wordId: w.id, kind: "flashcard", grade: 2 });
    expect((await vocabOverview(s)).lists).toHaveLength(1);

    await db.update(schema.classes).set({ archivedAt: new Date() }).where(eq(schema.classes.id, G.id));
    expect((await vocabOverview(s)).lists).toHaveLength(0);
    await expect(studentWordList(s, list)).rejects.toThrow();
    await db.update(schema.classes).set({ archivedAt: null }).where(eq(schema.classes.id, G.id));
    expect((await vocabOverview(s)).lists).toHaveLength(1);

    await db.delete(schema.classStudents).where(eq(schema.classStudents.studentId, s.id));
    expect((await vocabOverview(s)).lists).toHaveLength(0);
    await expect(recordReview(s, { wordId: w.id, kind: "flashcard", grade: 2 })).rejects.toThrow();
    const kept = await db.select().from(schema.vocabProgress).where(eq(schema.vocabProgress.studentId, s.id));
    expect(kept).toHaveLength(1);
  });

  it("teachers assign only to their own groups and assigning twice never duplicates", async () => {
    const admin = await makeUser("admin");
    const [mine, theirs] = [await makeClass("Mine"), await makeClass("Theirs")];
    const teacher = await makeUser("teacher");
    await teach(mine.id, teacher.id);
    const list = await makeList(admin, `Scope ${Date.now()}`, [["sun", "quyosh"]]);
    await expect(setWordListTargets(teacher, list, { classIds: [theirs.id], studentIds: [] })).rejects.toThrow();
    await setWordListTargets(teacher, list, { classIds: [mine.id, mine.id], studentIds: [] });
    await setWordListTargets(admin, list, { classIds: [mine.id, theirs.id], studentIds: [] });
    const rows = await db.select().from(schema.wordListTargets).where(eq(schema.wordListTargets.listId, list));
    expect(rows.map((r) => r.classId).sort()).toEqual([mine.id, theirs.id].sort());
  });
});
