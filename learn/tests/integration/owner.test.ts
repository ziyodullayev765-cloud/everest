import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/server/db";
import { ownerAddXp, ownerOverview, ownerRemoveBonus, ownerSetAchievement } from "@/server/services/owner";
import { xpTotal } from "@/server/services/gamification";
import { ensureAchievements } from "@/server/services/achievements";
import { makeUser } from "./fixtures";

afterAll(async () => closeDb());

describe("owner's private section", () => {
  it("only the configured account can use it, and only on its own data", async () => {
    await ensureAchievements();
    const owner = await makeUser("student");
    const other = await makeUser("student");
    process.env.OWNER_USERNAMES = `someone, ${owner.username.toUpperCase()}`;
    await expect(ownerOverview(other)).rejects.toMatchObject({ code: "not_found" });
    await expect(ownerAddXp(other, { amount: 100 })).rejects.toMatchObject({ code: "not_found" });

    await ownerSetAchievement(owner, "quiz_legend", true);
    let o = await ownerOverview(owner);
    expect(o.defs.find((d) => d.code === "quiz_legend")?.earnedAt).toBeTruthy();
    expect(o.xp).toBe(250);
    await ownerAddXp(owner, { amount: 100, note: "test" });
    o = await ownerOverview(owner);
    expect(o.xp).toBe(350);
    await ownerRemoveBonus(owner, o.bonuses[0].id);
    await ownerSetAchievement(owner, "quiz_legend", false);
    expect(await xpTotal(owner.id)).toBe(0);
    expect(await xpTotal(other.id)).toBe(0);
    delete process.env.OWNER_USERNAMES;
  });
});
