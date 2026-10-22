import { expect, type Page } from "@playwright/test";

const unlockHandled = new WeakSet<Page>();

export async function login(page: Page, username: string, password = "Demo12345") {
  if (!unlockHandled.has(page)) {
    unlockHandled.add(page);
    // The "new achievement" celebration can pop up after any learning action; close it and carry on.
    await page.addLocatorHandler(page.locator('[aria-labelledby="ach-title"]'), async (d) => {
      while (await d.isVisible()) await d.getByRole("button").first().click();
    });
  }
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}
