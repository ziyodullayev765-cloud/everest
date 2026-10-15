import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import zlib from "node:zlib";

const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? "", password: process.env.E2E_ADMIN_PASSWORD ?? "" };
const USER = { email: process.env.E2E_USER_EMAIL ?? "", password: process.env.E2E_USER_PASSWORD ?? "" };
const stamp = Date.now().toString(36);

test.describe.configure({ mode: "serial" });
test.skip(!ADMIN.email || !ADMIN.password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin tests");

const STATE = path.join(tmpdir(), `admin-state-${stamp}.json`);

async function login(page: Page, creds = ADMIN) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** A real PNG made from raw pixels (no image libraries needed). */
function makePng(file: string) {
  const w = 64,
    h = 48;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = 16;
      raw[o + 1] = 120 + x;
      raw[o + 2] = 80 + y;
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

test("rejects wrong password with a generic error", async ({ page }) => {
  await login(page, { email: ADMIN.email, password: "definitely-wrong-password" });
  await expect(page.locator("form").getByRole("alert")).toContainText("Incorrect email or password");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("authenticated non-admin users are refused", async ({ page }) => {
  test.skip(!USER.email, "Set E2E_USER_EMAIL / E2E_USER_PASSWORD to test a non-admin account");
  await login(page, USER);
  await expect(page.locator("form").getByRole("alert")).toContainText("does not have administrator access");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

// Sign in once and reuse the session: the login endpoint is deliberately rate limited.
test("admin signs in", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.context().storageState({ path: STATE });
});

test.describe("as admin", () => {
  test.use({ storageState: STATE });

  test("draft → preview → publish workflow for a project", async ({ page, context }) => {
    const title = `E2E Project ${stamp}`;
    const slug = `e2e-project-${stamp}`;
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

    await page.goto("/admin/projects/new");
    await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await expect(page.getByLabel("URL slug")).toHaveValue(slug);
    await page.getByLabel("Short summary").fill("Created by the end-to-end test.");
    await page.getByLabel("Full description").fill("## Heading\n\n- point one\n- **point two**");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f-]{36}$/);

    // Drafts are invisible to visitors.
    const visitor = await context.browser()!.newContext();
    const vpage = await visitor.newPage();
    expect((await vpage.goto(`/projects/${slug}`))?.status()).toBe(404);

    // ...but visible to the admin in preview mode.
    const [preview] = await Promise.all([context.waitForEvent("page"), page.getByRole("link", { name: "Preview" }).click()]);
    await preview.waitForLoadState();
    await expect(preview.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(preview.getByText("Ko‘rib chiqish rejimi")).toBeVisible();
    await preview.goto("/api/preview/exit");
    await preview.close();

    // Publish.
    await page.getByRole("radio", { name: "Published" }).click();
    await page.getByRole("button", { name: "Save & publish" }).click();
    await expect(page.getByText("Changes saved.")).toBeVisible();

    const res = await vpage.goto(`/projects/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(vpage.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(vpage.locator(".prose-rich h2")).toHaveText("Heading");
    await vpage.goto("/projects");
    await expect(vpage.getByRole("link", { name: title })).toBeVisible();

    // Unpublish from the list, then delete.
    await page.goto("/admin/projects");
    await page.getByPlaceholder("Search projects…").fill(stamp);
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("Moved to drafts.")).toBeVisible();
    expect((await vpage.goto(`/projects/${slug}`))?.status()).toBe(404);

    await page.getByRole("button", { name: `Delete ${title}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Project deleted.")).toBeVisible();
    await visitor.close();
  });

  test("form validation errors are shown", async ({ page }) => {
    await page.goto("/admin/skills/new");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Name is required")).toBeVisible();
    await page.getByRole("textbox", { name: "Name", exact: true }).fill(`Skill ${stamp}`);
    await page.getByLabel("Level (0–100, optional)").fill("150");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Maximum 100")).toBeVisible();
  });

  test("media upload, gallery publishing and deletion", async ({ page, context }) => {
    const dir = path.join(tmpdir(), `e2e-${stamp}`);
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `gallery-photo-${stamp}.png`);
    makePng(file);

    await page.goto("/admin/media");
    await page.locator('input[type="file"]').first().setInputFiles(file);
    const card = page.getByRole("button", { name: new RegExp(`gallery-photo-${stamp}`) });
    await expect(card).toBeVisible({ timeout: 20_000 });

    await card.click();
    const dialog = page.getByRole("dialog", { name: "Media details" });
    await dialog.getByLabel("Alt text").fill(`Test gallery image ${stamp}`);
    await dialog.getByLabel("Caption").fill("Uploaded by E2E");
    await dialog.getByRole("switch", { name: "Show in public gallery" }).click();
    await dialog.getByLabel("Gallery status").selectOption("published");
    await dialog.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    const visitor = await context.browser()!.newContext();
    const vpage = await visitor.newPage();
    await vpage.goto("/gallery");
    const img = vpage.getByRole("img", { name: `Test gallery image ${stamp}` });
    await expect(img).toBeVisible();
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

    await dialog.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog", { name: "Delete this file?" }).getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("File deleted.")).toBeVisible();
    await vpage.goto("/gallery");
    await expect(vpage.getByRole("img", { name: `Test gallery image ${stamp}` })).toHaveCount(0);
    await visitor.close();
  });

  test("rejects disallowed file types", async ({ page }) => {
    const file = path.join(tmpdir(), `evil-${stamp}.svg`);
    writeFileSync(file, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await page.goto("/admin/media");
    await page.locator('input[type="file"]').first().setInputFiles(file);
    await expect(page.getByText(/unsupported file type/)).toBeVisible();
  });

  test("settings changes appear on the public site", async ({ page, context }) => {
    await page.goto("/admin/settings");
    const field = page.getByLabel("Hero description");
    const original = await field.inputValue();
    const marker = `E2E hero description ${stamp}`;
    await field.fill(marker);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    const visitor = await context.browser()!.newContext();
    const vpage = await visitor.newPage();
    await vpage.goto("/");
    await expect(vpage.getByText(marker)).toBeVisible();
    await visitor.close();

    await field.fill(original);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    // An earlier "Saved." toast may still be on screen, so wait for the form itself to be clean.
    await expect(page.getByText("Unsaved changes")).toHaveCount(0);
    await page.reload();
    await expect(field).toHaveValue(original);
  });

  test("renaming the profile updates the name everywhere on the public site", async ({ page, context }) => {
    await page.goto("/admin/profile");
    const field = page.getByLabel("Full name");
    await expect(field).not.toHaveValue(""); // wait for the form to hydrate
    const original = await field.inputValue();
    const renamed = `Testname ${stamp}`;
    await field.fill(renamed);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    const visitor = await context.browser()!.newContext();
    const vpage = await visitor.newPage();
    await vpage.goto("/");
    await expect(vpage.getByRole("heading", { level: 1 })).toContainText("Testname");
    await expect(vpage).toHaveTitle(new RegExp(renamed));
    await expect(vpage.locator("footer")).toContainText(renamed);
    await vpage.goto("/about");
    await expect(vpage).toHaveTitle(new RegExp(renamed));
    await visitor.close();

    await field.fill(original);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    // An earlier "Saved." toast may still be on screen, so wait for the form itself to be clean.
    await expect(page.getByText("Unsaved changes")).toHaveCount(0);
    await page.reload();
    await expect(field).toHaveValue(original);
  });

  test("contact form submission reaches the admin inbox", async ({ page, context }) => {
    const visitor = await context.browser()!.newContext();
    const vpage = await visitor.newPage();
    await vpage.goto("/contact");
    await vpage.getByLabel("Ismingiz").fill("E2E Visitor");
    await vpage.getByLabel("Elektron pochta").fill("visitor@example.com");
    await vpage.getByLabel("Xabar").fill(`Hello from the end-to-end test ${stamp}`);
    await vpage.waitForTimeout(3200); // the form rejects submissions faster than a human could type
    await vpage.getByRole("button", { name: "Yuborish" }).click();
    await expect(vpage.getByText("Rahmat! Xabaringiz yuborildi")).toBeVisible();
    await visitor.close();

    await page.goto("/admin/messages");
    const row = page.getByRole("button", { name: new RegExp(`E2E Visitor`) }).first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.getByText(`Hello from the end-to-end test ${stamp}`).last()).toBeVisible();
  });

  test("sign out ends the session", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
