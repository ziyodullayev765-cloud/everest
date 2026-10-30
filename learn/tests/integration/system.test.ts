import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/server/db";
import { systemStatus } from "@/server/services/system";
import { makeUser } from "./fixtures";

afterAll(async () => closeDb());

describe("system status", () => {
  it("reports real database size, tables and activity to admins only", async () => {
    const admin = await makeUser("admin");
    const s = await systemStatus(admin);
    expect(s.db.used).toBeGreaterThan(0);
    expect(s.db.free + s.db.used).toBeGreaterThanOrEqual(s.db.limit);
    expect(s.tables.length).toBeGreaterThan(5);
    expect(s.connections.total).toBeGreaterThan(0);
    expect(typeof s.activity.logins).toBe("number");
    await expect(systemStatus(await makeUser("teacher"))).rejects.toThrow();
  });
});
