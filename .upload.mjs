import { chromium } from "playwright";
const S = process.argv[2]; const P = `${S}/photos`;
const BASE = "http://localhost:3000";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const log = (...a) => console.log(...a);
page.on("pageerror", (e) => log("PAGEERROR", e.message));

await page.goto(`${BASE}/admin/login`);
await page.getByLabel("Email").fill("admin@test.local");
await page.getByLabel("Password").fill("Correct-Horse-42x");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/admin(?!\/login)/);
log("logged in");

async function pickUpload(label, files, multiple = false) {
  await page.getByLabel(label, { exact: true }).first().click();
  const dlg = page.locator("dialog[open]").last();
  await dlg.getByRole("tab", { name: "Upload new" }).click();
  await dlg.locator('input[type="file"]').setInputFiles(files);
  if (multiple) {
    const btn = dlg.getByRole("button", { name: /Add \d+ selected/ });
    await btn.waitFor({ timeout: 30000 });
    await page.waitForFunction((n) => {
      const el = [...document.querySelectorAll("dialog[open] button")].find((x) => /Add \d+ selected/.test(x.textContent));
      return el && Number(el.textContent.match(/\d+/)[0]) >= n;
    }, files.length, { timeout: 30000 });
    await btn.click();
  }
  await page.waitForFunction(() => document.querySelectorAll("dialog[open]").length === 0, null, { timeout: 30000 });
}
async function save() {
  await page.getByRole("button", { name: /^(Save|Save changes|Publish|Update)$/ }).first().click();
  await page.getByText(/Saved|updated|published/i).first().waitFor({ timeout: 15000 });
}
async function galleryAdd(files) {
  await page.getByRole("button", { name: "Add images" }).click();
  const dlg = page.locator("dialog[open]").last();
  await dlg.getByRole("tab", { name: "Upload new" }).click();
  await dlg.locator('input[type="file"]').setInputFiles(files);
  await page.waitForFunction((n) => {
    const el = [...document.querySelectorAll("dialog[open] button")].find((x) => /Add \d+ selected/.test(x.textContent));
    return el && Number(el.textContent.match(/\d+/)[0]) >= n;
  }, files.length, { timeout: 60000 });
  await dlg.getByRole("button", { name: /Add \d+ selected/ }).click();
  await page.waitForFunction(() => document.querySelectorAll("dialog[open]").length === 0);
}
const step = async (name, fn) => {
  try { await fn(); log("OK  ", name); } catch (e) { log("FAIL", name, e.message.split("\n")[0]); await page.screenshot({ path: `${S}/fail-${name.replace(/\W+/g, "_")}.png` }); }
};

await step("profile avatar", async () => {
  await page.goto(`${BASE}/admin/profile`);
  await pickUpload("Profile photo", [`${P}/avatar.jpg`]);
  await save();
});
await step("settings logo + og", async () => {
  await page.goto(`${BASE}/admin/settings`);
  await pickUpload("Logo", [`${P}/logo.png`]);
  await save();
});
const projects = { "29507676-2021-431a-9582-62b40a85cbb8": [1, 2, 3], "8a796b5f-84b4-4ae6-8329-ee22ceb700b2": [4, 5], "a99ef003-5970-47cf-8001-4c3b30c3561f": [6, 7], "42014368-6377-4a76-bf26-477ff1194f60": [8, 9] };
for (const [id, imgs] of Object.entries(projects)) {
  await step(`project ${id.slice(0, 6)}`, async () => {
    await page.goto(`${BASE}/admin/projects/${id}`);
    await pickUpload("Card image", [`${P}/photo-${String(imgs[0]).padStart(2, "0")}.jpg`]);
    await galleryAdd(imgs.slice(1).map((n) => `${P}/photo-${String(n).padStart(2, "0")}.jpg`));
    await save();
  });
}
for (const [id, n] of [["1be7ea8f-7de2-44f0-a05e-b43f5041e97f", 10], ["ee37ebc3-20d8-4d3a-8d21-5dbcb6530678", 11]]) {
  await step(`achievement ${id.slice(0, 6)}`, async () => {
    await page.goto(`${BASE}/admin/achievements/${id}`);
    await pickUpload("Image", [`${P}/photo-${n}.jpg`]);
    await save();
  });
}
await step("experience logo", async () => {
  await page.goto(`${BASE}/admin/experience/1d0b4064-6eed-450b-9c87-26e52f102d0f`);
  await pickUpload("Logo / image", [`${P}/logo.png`]);
  await save();
});
await step("media library gallery upload", async () => {
  await page.goto(`${BASE}/admin/media`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="file"]').first().setInputFiles([12, 13, 14, 1, 5, 9].map((n) => `${P}/photo-${String(n).padStart(2, "0")}.jpg`));
  await page.waitForTimeout(8000);
});
await step("music", async () => {
  await page.goto(`${BASE}/admin/music`);
  await pickUpload("Music file (MP3, M4A, OGG, WAV — max 15 MB)", [`${P}/calm-track.wav`]);
  await page.getByLabel("Track name (shown on the music button)").fill("Calm evening");
  await save();
});
await b.close();
