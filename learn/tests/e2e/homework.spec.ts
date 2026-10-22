import { expect, test } from "@playwright/test";
import path from "node:path";
import { login, logout } from "./helpers";

test.describe.configure({ mode: "serial" });
const fx = (f: string) => path.join(import.meta.dirname, "fixtures", f);
const TITLE = `Uyga vazifa ${Date.now().toString(36)}`;
const BOOK = `Barron's Reading ${Date.now().toString(36)}`;

test("admin adds a book with cover, PDF and audio", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin/library/new");
  await page.getByLabel("Nomi").fill(BOOK);
  await page.locator('input[type=file][accept^="image/"]').setInputFiles(fx("board.png"));
  await expect(page.locator('img[src^="/api/files/"]')).toBeVisible();
  await page.locator('input[type=file][accept^="application/pdf"]').setInputFiles(fx("book.pdf"));
  await expect(page.getByText("book.pdf")).toBeVisible();
  await page.locator('input[type=file][accept^="audio/"]').setInputFiles(fx("track01.mp3"));
  await expect(page.getByLabel("Trek nomi")).toHaveValue("track01");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page).toHaveURL(/\/admin\/library\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("button", { name: /Kitobni o‘qish/ })).toBeVisible();
});

test("admin builds homework from the template, links the book and attaches a board photo", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin/assignments/new");
  await page.getByLabel("Sarlavha").fill(TITLE);
  await page.getByRole("button", { name: "Namuna" }).click();
  await expect(page.getByLabel("Topshiriq nomi")).toHaveCount(5);
  await page.getByLabel("Kitob").first().selectOption({ label: BOOK });
  await page.locator('input[type=file][multiple]').first().setInputFiles(fx("board.png"));
  await expect(page.getByText("board.png")).toBeVisible();
  await page.getByRole("checkbox", { name: /Intermediate/ }).check();
  await page.getByRole("button", { name: "E’lon qilish" }).last().click();
  await expect(page).toHaveURL(/\/admin\/assignments\/[0-9a-f-]{36}/);
});

test("student sees the list, the board photo and the book; ticks items and submits", async ({ page }) => {
  await login(page, "ali.valiyev");
  await page.goto("/assignments");
  await page.getByText(TITLE).click();
  await expect(page.getByText("Barron's Reading").first()).toBeVisible();
  await expect(page.getByText("18-betgacha")).toBeVisible();
  await expect(page.locator('img[alt="board.png"]')).toBeVisible();
  await page.getByRole("link", { name: BOOK }).click();
  await expect(page.getByRole("heading", { name: BOOK })).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(1);
  // The PDF opens in the in-app reader (a new tab loses the session in the installed app).
  await page.getByRole("button", { name: /Kitobni o‘qish/ }).click();
  const reader = page.getByRole("dialog");
  await expect(reader.getByText("1 / 2 bet")).toBeVisible();
  await expect.poll(() => reader.locator('canvas[aria-label="1-bet"]').evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(0);
  await page.goBack(); // the back gesture closes the reader, not the page
  await expect(reader).toHaveCount(0);
  await expect(page.getByRole("heading", { name: BOOK })).toBeVisible();
  // Save the book on the device; the worker then serves it (with byte ranges) without the network.
  await page.getByRole("button", { name: /Offline saqlash/ }).click();
  await expect(page.getByText("Telefonda saqlangan")).toBeVisible();
  const src = await page.locator("audio").first().getAttribute("src");
  await page.context().setOffline(true);
  const r = await page.evaluate(async (u) => {
    const res = await fetch(u!, { headers: { Range: "bytes=0-9" } });
    return { status: res.status, len: (await res.arrayBuffer()).byteLength };
  }, src);
  await page.context().setOffline(false);
  expect(r).toEqual({ status: 206, len: 10 });
  await page.goBack();
  await page.getByRole("link", { name: /Bajarishni boshlash/ }).click();
  await page.getByLabel("Barron's Reading — bajarildi").check();
  await page.getByLabel(/B2 unit.*— bajarildi/).check();
  await page.getByLabel("Text translation — matn").fill("Men har kuni kitob o‘qiyman.");
  await expect(page.getByText("3 / 5 bajarildi")).toBeVisible();
  await page.getByRole("button", { name: "Topshirish" }).click();
  await expect(page.getByText("Bajarilgan topshiriqlar: 3 / 5")).toBeVisible();
  await page.getByRole("button", { name: "Ha, topshirish" }).click();
  await expect(page.getByRole("heading", { name: "Ishingiz topshirildi" })).toBeVisible();
});

test("teacher sees which items were done and the translation", async ({ page }) => {
  await logout(page);
  await login(page, "t.rahimov");
  await page.goto("/teacher/submissions");
  await page.getByText(TITLE).first().click();
  await expect(page.getByText("3 / 5")).toBeVisible();
  await expect(page.getByText("Men har kuni kitob o‘qiyman.")).toBeVisible();
});
