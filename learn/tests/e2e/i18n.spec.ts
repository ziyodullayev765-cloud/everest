import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("the whole interface switches to English and back", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByRole("radio", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await login(page, "ali.valiyev");
  await expect(page.getByRole("link", { name: "Home" }).first()).toBeVisible();
  await page.goto("/vocabulary");
  await expect(page.getByRole("heading", { name: "Vocabulary" })).toBeVisible();
  await page.goto("/profile/settings");
  await page.getByRole("radio", { name: "O‘zbekcha" }).click();
  await expect(page.getByRole("heading", { name: "Sozlamalar" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "uz");
});
