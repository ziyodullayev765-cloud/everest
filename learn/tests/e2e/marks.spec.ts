import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";

test("teacher marks a student's Writing and the student sees it in Grades", async ({ page }) => {
  await login(page, "t.rahimov");
  await page.goto("/teacher/marks?area=writing");
  await expect(page.getByRole("heading", { name: "Dars baholari" })).toBeVisible();
  const row = page.getByRole("radiogroup", { name: /Ali Valiyev/ });
  await row.getByRole("radio", { name: /5/ }).click();
  await expect(row.getByRole("radio", { name: /5/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(/1 \/ \d+ o‘quvchi baholandi/)).toBeVisible();
  // Reading: "not done" (3), then change it to 4.
  await page.getByRole("link", { name: "Reading", exact: true }).click();
  await expect(page).toHaveURL(/area=reading/, { timeout: 15_000 });
  const r2 = page.getByRole("radiogroup", { name: /Ali Valiyev/ });
  await r2.getByRole("radio", { name: /3/ }).click();
  await r2.getByRole("radio", { name: /4/ }).click();
  await expect(r2.getByRole("radio", { name: /4/ })).toHaveAttribute("aria-checked", "true");
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByRole("radiogroup", { name: /Ali Valiyev/ }).getByRole("radio", { name: /4/ })).toHaveAttribute("aria-checked", "true");
  await logout(page);

  await login(page, "ali.valiyev");
  await page.goto("/grades");
  await expect(page.getByRole("heading", { name: "Dars baholari" })).toBeVisible();
  await expect(page.getByText("Writing").first()).toBeVisible();
  await page.getByText("Barcha baholar ro‘yxati").click();
  await expect(page.locator("details[open] li", { hasText: "Reading" }).first()).toContainText("4");
});

test("a student cannot open the marking page", async ({ page }) => {
  await login(page, "ali.valiyev");
  const r = await page.goto("/teacher/marks");
  expect(page.url()).not.toContain("/teacher/marks");
  void r;
});
