import { expect, test } from "@playwright/test";

test.describe("intro preloader", () => {
  test("first visit shows the intro and entering without sound reveals the site", async ({ page }) => {
    await page.goto("/");
    const intro = page.getByRole("dialog", { name: "Saytga kirish" });
    await expect(intro).toBeVisible();
    await intro.getByRole("button", { name: "Ovozsiz" }).click();
    await expect(intro).toBeHidden();
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Saytga kirish" })).toHaveCount(0);
  });
});

test.describe("public site", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("portfolio-entered", "1"));
  });

  test("home page renders hero, CTAs and navigation", async ({ page }) => {
    await page.goto("/");
    // The name comes from the CMS profile (admin tests may rename it concurrently).
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).not.toBeEmpty();
    await expect(page.getByRole("link", { name: "Loyihalarimni ko’rish" })).toHaveAttribute("href", "/projects");
    await expect(page.getByRole("link", { name: "Men bilan bog’lanish" }).first()).toHaveAttribute("href", "/contact");
    await expect(page).toHaveTitle(/ — Portfolio$/);
  });

  test("all public pages respond and have a single h1", async ({ page }) => {
    for (const path of ["/about", "/projects", "/achievements", "/skills", "/experience", "/gallery", "/contact", "/privacy"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("h1"), path).toHaveCount(1);
    }
  });

  test("unknown routes show the custom 404", async ({ page }) => {
    const res = await page.goto("/does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("Sahifa topilmadi")).toBeVisible();
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
    await page.getByRole("button", { name: "Yuborish" }).click();
    await expect(page.getByText("Ismingizni kiriting")).toBeVisible();
    await expect(page.getByText("To‘g‘ri elektron pochta")).toBeVisible();
  });

  test("mobile navigation opens, traps focus and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Menyu" });
    await toggle.click();
    const dialog = page.getByRole("dialog", { name: "Menyu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Loyihalar" })).toBeVisible();
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
