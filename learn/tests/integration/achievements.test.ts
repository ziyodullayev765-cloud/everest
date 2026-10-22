import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, db } from "@/server/db";
import { saveAssignment, saveQuestions, setAssignmentStatus } from "@/server/services/assignments";
import { attemptView, saveAnswer, startAttempt, submitAttempt } from "@/server/services/quiz";
import {
  achievementEarners,
  adminAchievements,
  evaluateAchievements,
  markAchievementsSeen,
  saveAchievement,
  setAchievementActive,
  studentAchievements,
  unseenAchievements,
} from "@/server/services/achievements";
import { baseAssignment, makeSubject, world } from "./fixtures";

afterAll(async () => closeDb());

async function perfectTenseQuiz(w: Awaited<ReturnType<typeof world>>) {
  const grammar = await makeSubject("GRAMMAR");
  const { id } = await saveAssignment(w.teacher, null, baseAssignment(grammar.id, [w.cls.id], { type: "timed_quiz", publishMode: "draft", timeLimitMinutes: 10, topic: "Present Perfect" }));
  await saveQuestions(w.teacher, id, [{ type: "translation", prompt: "Men talabaman.", points: 2, direction: "uz_en", accepted: [["I am a student"]] }]);
  await setAssignmentStatus(w.teacher, id, "publish");
  const { attemptId } = await startAttempt(w.student, id);
  const v = await attemptView(w.student, attemptId);
  await saveAnswer(w.student, attemptId, v.questions[0].id, { text: "I am a student" });
  await submitAttempt(w.student, attemptId);
  return id;
}

const xpRows = async (userId: string) =>
  (await db.execute<{ n: number; total: number }>(sql`select count(*)::int as n, coalesce(sum(amount),0)::int as total from xp_transactions where user_id = ${userId} and reason = 'achievement'`))[0];

describe("achievements", () => {
  it("unlock from real results once, give their XP once and celebrate once", async () => {
    const w = await world();
    await perfectTenseQuiz(w);
    const { list } = await studentAchievements(w.student.id);
    const earned = list.filter((a) => a.earnedAt).map((a) => a.code);
    expect(earned).toEqual(expect.arrayContaining(["first_step", "first_win", "sharp_answer", "perfect_score", "grammar_beginner", "perfect_tense"]));
    expect(earned).not.toContain("quiz_master");
    const quizMaster = list.find((a) => a.code === "quiz_master")!;
    expect(quizMaster.progress).toEqual({ value: 1, target: 10, ratio: 0.1 });

    const xp = await xpRows(w.student.id);
    expect(xp.n).toBe(earned.length > 0 ? list.filter((a) => a.earnedAt && a.xpReward > 0).length : 0);
    // Re-checking (e.g. after another action) awards nothing new.
    expect(await evaluateAchievements(w.student.id)).toEqual([]);
    expect(await xpRows(w.student.id)).toEqual(xp);

    const unseen = await unseenAchievements(w.student.id);
    expect(unseen.map((u) => u.code)).toEqual(expect.arrayContaining(["first_win", "perfect_score"]));
    await markAchievementsSeen(w.student.id, unseen.map((u) => u.code));
    const left = await unseenAchievements(w.student.id);
    expect(left.length).toBeLessThan(Math.max(1, unseen.length));
  });

  it("admins define rules; disabled rules don't unlock; only admins may edit", async () => {
    const w = await world();
    await expect(saveAchievement(w.teacher, null, { title: "Hack", category: "quiz", icon: "Star", metric: "quizzes_done", threshold: 1, xpReward: 5 })).rejects.toMatchObject({ code: "forbidden" });
    const code = await saveAchievement(w.admin, null, { title: "Quiz Starter Plus", description: "Bitta quiz", category: "quiz", icon: "Star", metric: "quizzes_done", threshold: 1, xpReward: 7, active: false });
    expect(code).toMatch(/^c_quiz_starter_plus/);
    await perfectTenseQuiz(w);
    expect((await studentAchievements(w.student.id)).list.find((a) => a.code === code)).toBeUndefined();

    await setAchievementActive(w.admin, code, true);
    expect(await evaluateAchievements(w.student.id)).toEqual([code]);
    const { rows } = await achievementEarners(w.admin, code);
    expect(rows.map((r) => r.id)).toEqual([w.student.id]);
    expect((await adminAchievements(w.admin)).find((a) => a.code === code)?.earners).toBe(1);
    await setAchievementActive(w.admin, code, false);
    // Earned badges stay with the student even when the rule is switched off.
    expect((await studentAchievements(w.student.id)).list.find((a) => a.code === code)?.earnedAt).toBeTruthy();
  });
});
