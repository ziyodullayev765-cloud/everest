import { expect, type Page } from "@playwright/test";

export async function login(page: Page, username: string, password = "Demo12345") {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Login").fill(username);
  await page.getByLabel("Parol", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Kirish" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}
