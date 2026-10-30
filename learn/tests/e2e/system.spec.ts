import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";

test("admin sees database status; teachers cannot open it", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Baza holati" })).toBeVisible();
  await page.goto("/admin/system");
  await expect(page.getByRole("heading", { name: "Baza holati", level: 1 })).toBeVisible();
  await expect(page.getByText(/MB bo‘sh/).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Foydalanuvchilar/ })).toBeVisible();
  await logout(page);
  await login(page, "t.rahimov");
  await page.goto("/admin/system");
  await expect(page.getByRole("heading", { name: "Baza holati", level: 1 })).toHaveCount(0);
});
