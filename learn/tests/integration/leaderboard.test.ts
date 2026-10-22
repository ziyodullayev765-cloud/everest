import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, db } from "@/server/db";
import { currentWeek, finalizeWeek, groupRanking, leaderboardView, medalCounts } from "@/server/services/leaderboard";
import { awardXp } from "@/server/services/gamification";
import { ownerAddXp } from "@/server/services/owner";
import { enroll, makeClass, makeUser, teach } from "./fixtures";

afterAll(async () => closeDb());

describe("weekly group ranking and medals", () => {
  it("ranks by this week's points, ignores owner bonuses, and awards places 1–3 once", async () => {
    const cls = await makeClass("Ranking group");
    const teacher = await makeUser("teacher");
    await teach(cls.id, teacher.id);
    const [a, b, c, d] = [await makeUser("student"), await makeUser("student"), await makeUser("student"), await makeUser("student")];
    for (const s of [a, b, c, d]) await enroll(cls.id, s.id);
    const week = currentWeek();
    await awardXp(a.id, 50, "test", `t:${a.id}`);
    await awardXp(b.id, 80, "test", `t:${b.id}`);
    await awardXp(c.id, 50, "test", `t:${c.id}`);
    process.env.OWNER_USERNAMES = d.username;
    await ownerAddXp(d, { amount: 1000 }); // must not count
    delete process.env.OWNER_USERNAMES;

    const rows = await groupRanking(cls.id, week.start);
    expect(rows.map((r) => [r.studentId, r.score, r.place])).toEqual([
      [b.id, 80, 1],
      ...[a, c].sort((x, y) => (x.username < y.username ? -1 : 1)).map(() => expect.anything()),
      [d.id, 0, 4],
    ]);
    expect(rows.filter((r) => r.score === 50).every((r) => r.place === 2)).toBe(true); // ties share a place

    // The current week can't be finalised; move this week's XP into last week to test awarding.
    expect(await finalizeWeek(week.start)).toBe(0);
    await db.execute(sql`update xp_transactions set created_at = created_at - interval '7 days' where user_id in (${a.id}, ${b.id}, ${c.id}, ${d.id})`);
    await finalizeWeek(week.prev);
    await finalizeWeek(week.prev); // idempotent
    expect(await medalCounts(b.id)).toEqual({ gold: 1, silver: 0, bronze: 0 });
    expect(await medalCounts(a.id)).toEqual({ gold: 0, silver: 1, bronze: 0 });
    expect(await medalCounts(d.id)).toEqual({ gold: 0, silver: 0, bronze: 0 }); // no points, no medal

    const v = await leaderboardView(teacher, cls.id);
    expect(v?.last.map((w) => w.place)).toEqual([1, 2, 2]);
    const outsider = await makeUser("student");
    expect((await leaderboardView(outsider))?.group).toBeNull();
  });
});
