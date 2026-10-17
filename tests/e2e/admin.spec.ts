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
  await page.getByLabel("Email", { exact: true }).fill(creds.email);
  await page.getByLabel("Password", { exact: true }).fill(creds.password);
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
    await expect(page.getByLabel("URL slug", { exact: true })).toHaveValue(slug);
    await page.getByLabel("Short summary", { exact: true }).fill("Created by the end-to-end test.");
    await page.getByLabel("Full description", { exact: true }).fill("## Heading\n\n- point one\n- **point two**");
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
    await expect(preview.getByText("Preview mode")).toBeVisible();
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
    await page.getByLabel("Level (0–100, optional)", { exact: true }).fill("150");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Maximum 100")).toBeVisible();
  });

  test("media upload, gallery publishing and deletion", async ({ page, context }) => {
    const dir = path.join(tmpdir(), `e2e-${stamp}`);
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `gallery-photo-${stamp}.png`);
    makePng(file);

    await page.goto("/admin/media", { waitUntil: "networkidle" }); // file input must be hydrated
    await page.locator('input[type="file"]').first().setInputFiles(file);
    const card = page.getByRole("button", { name: new RegExp(`gallery-photo-${stamp}`) });
    await expect(card).toBeVisible({ timeout: 20_000 });

    await card.click();
    const dialog = page.getByRole("dialog", { name: "Media details" });
    await dialog.getByLabel("Alt text", { exact: true }).fill(`Test gallery image ${stamp}`);
    await dialog.getByLabel("Caption", { exact: true }).fill("Uploaded by E2E");
    // Uploads from the media library are published to the gallery by default.
    await expect(dialog.getByRole("switch", { name: "Show in public gallery" })).toHaveAttribute("aria-checked", "true");
    await expect(dialog.getByLabel("Gallery status", { exact: true })).toHaveValue("published");
    await dialog.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    const visitor = await context.browser()!.newContext();
    const vpage = await visitor.newPage();
    await vpage.goto("/gallery");
    // Every gallery photo is placed on the dome's tiles.
    const img = vpage
      .locator(".dome")
      .getByRole("img", { name: `Test gallery image ${stamp}` })
      .first();
    await expect(img).toBeAttached();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth), { timeout: 20_000 }).toBeGreaterThan(0);

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
    await page.goto("/admin/media", { waitUntil: "networkidle" }); // file input must be hydrated
    await page.locator('input[type="file"]').first().setInputFiles(file);
    await expect(page.getByText(/unsupported file type/)).toBeVisible();
  });

  test("settings changes appear on the public site", async ({ page, context }) => {
    await page.goto("/admin/settings");
    const field = page.getByLabel("Hero description", { exact: true });
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

  test("Uzbek translations show to visitors who chose Uzbek", async ({ page, context }) => {
    await page.goto("/admin/settings");
    const uz = page.getByLabel("Hero description · O‘zbekcha", { exact: true });
    await uz.fill(`E2E o‘zbekcha tavsif ${stamp}`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    const visitor = await context.browser()!.newContext();
    await visitor.addCookies([{ name: "lang", value: "uz", url: new URL(page.url()).origin }]);
    const vpage = await visitor.newPage();
    await vpage.goto("/");
    await expect(vpage.getByText(`E2E o‘zbekcha tavsif ${stamp}`)).toBeVisible();
    await visitor.close();

    // English visitors still get the main text.
    const en = await context.browser()!.newContext();
    const epage = await en.newPage();
    await epage.goto("/");
    await expect(epage.getByText(`E2E o‘zbekcha tavsif ${stamp}`)).toHaveCount(0);
    await en.close();

    await uz.fill("");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Unsaved changes")).toHaveCount(0);
  });

  test("music has its own admin page and saving it leaves other settings alone", async ({ page }) => {
    await page.goto("/admin/settings");
    const hero = await page.getByLabel("Hero description", { exact: true }).inputValue();
    await expect(page.getByText("Background music")).toHaveCount(0);

    await page.goto("/admin/music");
    const title = page.getByLabel("Track name (shown on the music button)", { exact: true });
    const original = await title.inputValue();
    await title.fill(`E2E track ${stamp}`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.reload();
    await expect(title).toHaveValue(`E2E track ${stamp}`);
    await title.fill(original);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Unsaved changes")).toHaveCount(0);

    await page.goto("/admin/settings");
    await expect(page.getByLabel("Hero description", { exact: true })).toHaveValue(hero);
  });

  test("renaming the profile updates the name everywhere on the public site", async ({ page, context }) => {
    await page.goto("/admin/profile");
    const field = page.getByRole("textbox", { name: "Full name", exact: true });
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
    await vpage.getByLabel("Name", { exact: true }).fill("E2E Visitor");
    await vpage.getByLabel("Email", { exact: true }).fill("visitor@example.com");
    await vpage.getByLabel("Project scope / message", { exact: true }).fill(`Hello from the end-to-end test ${stamp}`);
    await vpage.waitForTimeout(3200); // the form rejects submissions faster than a human could type
    await vpage.getByRole("button", { name: "Send message" }).click();
    await expect(vpage.getByText("Thank you! Your message is on its way")).toBeVisible();
    await visitor.close();

    await page.goto("/admin/messages");
    const row = page.getByRole("button", { name: new RegExp(`E2E Visitor`) }).first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.getByText(`Hello from the end-to-end test ${stamp}`).last()).toBeVisible();
  });

  test("quick reply fills a ready-made answer for the sender", async ({ page }) => {
    await page.goto("/admin/messages");
    await page
      .getByRole("button", { name: /E2E Visitor/ })
      .first()
      .click();
    const reply = page.getByLabel("Reply text").first();
    await expect(reply).toHaveValue(/Assalomu alaykum, E2E!/);
    await page.getByLabel("Quick reply").first().selectOption("thanks-en");
    await expect(reply).toHaveValue(/^Hi E2E,/);
    const href = await page.getByRole("link", { name: "Open in email app" }).first().getAttribute("href");
    expect(href).toMatch(/^mailto:visitor@example\.com\?subject=Re/);
    expect(decodeURIComponent(href!)).toContain("Thanks for reaching out");
    await expect(page.getByText("Last 7 days")).toBeVisible();
  });

  test("blog post and testimonial go live from the admin", async ({ page, context }) => {
    const title = `E2E Post ${stamp}`;
    const slug = `e2e-post-${stamp}`;
    await page.goto("/admin/posts/new");
    await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await expect(page.getByLabel("URL slug", { exact: true })).toHaveValue(slug);
    await page.getByLabel("Excerpt", { exact: true }).fill("An article written by the end-to-end test.");
    await page.getByLabel("Article text", { exact: true }).fill("## Section\n\nSome `code` here.");
    await page.getByRole("radio", { name: "Published" }).click();
    await page.getByRole("button", { name: "Save & publish" }).click();
    await expect(page).toHaveURL(/\/admin\/posts\/[0-9a-f-]{36}$/);

    await page.goto("/admin/testimonials/new");
    await page.getByRole("textbox", { name: "Quote", exact: true }).fill(`A kind word ${stamp}`);
    await page.getByRole("textbox", { name: "Person", exact: true }).fill("E2E Mentor");
    await page.getByRole("radio", { name: "Published" }).click();
    await page.getByRole("button", { name: "Save & publish" }).click();
    await expect(page).toHaveURL(/\/admin\/testimonials\/[0-9a-f-]{36}$/);

    const visitor = await context.browser()!.newContext();
    const vpage = await visitor.newPage();
    await vpage.goto("/blog");
    await expect(vpage.getByRole("link", { name: new RegExp(title) })).toBeVisible();
    await vpage.getByRole("link", { name: new RegExp(title) }).click();
    await expect(vpage.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(vpage.locator(".prose-rich h2")).toHaveText("Section");
    await vpage.goto("/");
    await expect(vpage.getByText(`A kind word ${stamp}`)).toBeVisible();
    await visitor.close();

    for (const [res, name] of [
      ["posts", title],
      ["testimonials", "E2E Mentor"],
    ] as const) {
      await page.goto(`/admin/${res}`);
      await page
        .getByRole("button", { name: `Delete ${name}` })
        .first()
        .click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
      await expect(page.getByRole("button", { name: `Delete ${name}` })).toHaveCount(0);
    }
  });

  test("guestbook: visitors sign, the admin approves, the note goes live", async ({ page, context }) => {
    const note = `Hello from e2e ${stamp}`;
    const visitor = await context.browser()!.newContext();
    const vpage = await visitor.newPage();
    await vpage.goto("/guestbook");
    await vpage.getByLabel("Your name").fill("E2E Guest");
    await vpage.getByLabel(/Your note/).fill(note);
    await vpage.waitForTimeout(2800);
    await vpage.getByRole("button", { name: "Sign the guestbook" }).click();
    await expect(vpage.getByText("Your note will appear after review")).toBeVisible();
    await vpage.reload();
    await expect(vpage.getByText(note)).toHaveCount(0);

    await page.goto("/admin/guestbook");
    const card = page.locator("li", { hasText: note });
    await expect(card.getByText("Waiting for review")).toBeVisible();
    await card.getByRole("button", { name: "Approve" }).click();
    await expect(card.getByText("Visible")).toBeVisible();

    await vpage.goto("/guestbook");
    await expect(vpage.getByText(note)).toBeVisible();
    await visitor.close();

    await card.getByRole("button", { name: /Delete note/ }).click();
    await expect(page.locator("li", { hasText: note })).toHaveCount(0);
  });

  test("duplicate copies an item as a new draft", async ({ page }) => {
    await page.goto("/admin/stats");
    const first = page.getByRole("button", { name: /^Duplicate / }).first();
    test.skip((await first.count()) === 0, "no statistics in the test data");
    await first.click();
    await expect(page).toHaveURL(/\/admin\/stats\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("radio", { name: "Draft" })).toBeChecked();
    const label = page.getByRole("textbox", { name: "Label", exact: true });
    await expect(label).toHaveValue(/\(copy\)$/);
    const name = await label.inputValue();
    await page.goto("/admin/stats");
    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("button", { name: `Delete ${name}` })).toHaveCount(0);
  });

  test("Now line and Uses page appear once filled in", async ({ page, context }) => {
    const visitor = await context.browser()!.newContext();
    const vpage = await visitor.newPage();
    expect((await vpage.goto("/uses"))?.status()).toBe(404);

    await page.goto("/admin/settings");
    await page.getByLabel("Now (one line)", { exact: true }).fill(`Building things ${stamp}`);
    await page.getByLabel("Uses page", { exact: true }).fill("## Software\n\n- VS Code\n- Figma");
    await page.getByRole("button", { name: /^Save/ }).first().click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();

    await vpage.goto("/");
    await expect(vpage.getByText(`Building things ${stamp}`)).toBeVisible();
    expect((await vpage.goto("/uses"))?.status()).toBe(200);
    await expect(vpage.getByRole("heading", { name: "Software" })).toBeVisible();
    await visitor.close();

    await page.goto("/admin/settings");
    await page.getByLabel("Now (one line)", { exact: true }).fill("");
    await page.getByLabel("Uses page", { exact: true }).fill("");
    await page.getByRole("button", { name: /^Save/ }).first().click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  });

  test("messages page offers push notifications and the admin can be installed", async ({ page, context, baseURL }) => {
    await context.grantPermissions(["notifications"], { origin: new URL(baseURL!).origin });
    await page.goto("/admin/messages");
    await expect(page.getByText("Push notifications", { exact: true })).toBeVisible();
    // Either the switch is offered, or (headless browsers often report notifications
    // as blocked) the card explains how to allow them.
    await expect(
      page.getByRole("button", { name: "Turn on" }).or(page.getByText(/Notifications are blocked for this site/)),
    ).toBeVisible();
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/admin.webmanifest");
    const sw = await page.request.get("/sw.js");
    expect(sw.ok()).toBe(true);
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
