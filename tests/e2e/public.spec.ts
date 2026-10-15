import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("home opens straight away — no intro overlay", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Explore Projects" })).toBeVisible();
  });

  test("home page renders hero, CTAs and navigation", async ({ page }) => {
    await page.goto("/");
    // The name comes from the CMS profile (admin tests may rename it concurrently).
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).not.toBeEmpty();
    // Hero buttons jump to the sections on the same page.
    await expect(page.getByRole("link", { name: "Explore Projects" })).toHaveAttribute("href", "#projects");
    await expect(page.getByRole("link", { name: "Start a Project" }).first()).toHaveAttribute("href", "#contact");
    await expect(page.locator("#projects")).toBeAttached();
    await expect(page.locator("#contact form")).toBeAttached();
    await expect(page).toHaveTitle(/ — Portfolio$/);
  });

  test("interface language switches between English, Uzbek and Russian", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page
      .getByRole("button", { name: /^Language:/ })
      .first()
      .click();
    await page.getByRole("option", { name: /Русский/ }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("heading", { name: "Избранные проекты" })).toBeVisible();
    await page
      .getByRole("button", { name: /^Язык:/ })
      .first()
      .click();
    await page.getByRole("option", { name: /O‘zbekcha/ }).click();
    await expect(page.getByRole("heading", { name: "Tanlangan loyihalar" })).toBeVisible();
    // The choice is remembered.
    await page.goto("/contact");
    await expect(page.locator("html")).toHaveAttribute("lang", "uz");
  });

  test("every menu item opens its own page, never a home-page anchor", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator("header nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThan(3);
    for (const href of hrefs) expect(href, href).not.toContain("#");
  });

  test("all public pages respond and have a single h1", async ({ page }) => {
    for (const path of [
      "/about",
      "/projects",
      "/highlights",
      "/achievements",
      "/skills",
      "/experience",
      "/gallery",
      "/contact",
      "/privacy",
    ]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("h1"), path).toHaveCount(1);
    }
  });

  test("unknown routes show the custom 404", async ({ page }) => {
    const res = await page.goto("/does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    const missingProject = await page.goto("/projects/no-such-project");
    expect(missingProject?.status()).toBe(404);
  });

  test("robots and sitemap exist and hide /admin", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain("/projects");
  });

  test("security headers are present", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
  });

  test("admin area requires sign-in", async ({ page }) => {
    await page.goto("/admin/projects");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("contact form validates on the client", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Please enter your name")).toBeVisible();
    await expect(page.getByText("Please enter a valid email")).toBeVisible();
  });

  test("mobile navigation opens, traps focus and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Menu", exact: true });
    await toggle.click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Projects" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("no horizontal overflow on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    for (const path of ["/", "/projects", "/contact", "/about"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
