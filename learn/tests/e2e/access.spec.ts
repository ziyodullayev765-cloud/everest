import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("signed-out visitors are sent to login", async ({ page }) => {
  await page.goto("/grades");
  await expect(page).toHaveURL(/\/login\?next=%2Fgrades/);
});

test("students cannot reach staff areas or staff APIs", async ({ page, request }) => {
  await login(page, "ali.valiyev");
  await page.goto("/admin");
  await expect(page).toHaveURL("/");
  await page.goto("/teacher/submissions");
  await expect(page).toHaveURL("/");
  const ctx = page.context().request;
  const res = await ctx.get("/api/export/gradebook?class=00000000-0000-0000-0000-000000000000");
  expect([403, 404]).toContain(res.status());
  // Own grades only.
  const g = await ctx.get("/api/v1/grades");
  expect(g.status()).toBe(200);
  // Unauthenticated API calls are rejected.
  expect((await request.get("/api/v1/grades")).status()).toBe(401);
});

test("teachers cannot open admin pages", async ({ page }) => {
  await login(page, "t.saidova");
  await page.goto("/admin/students");
  await expect(page).toHaveURL("/teacher");
});

test("wrong password shows a generic error", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Login").fill("ali.valiyev");
  await page.getByLabel("Parol", { exact: true }).fill("wrong-password1");
  await page.getByRole("button", { name: "Kirish" }).click();
  await expect(page.getByText("Login yoki parol noto‘g‘ri.")).toBeVisible();
});
