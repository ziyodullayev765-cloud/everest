import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";

test.describe.configure({ mode: "serial" });
const LIST = `Food ${Date.now().toString(36)}`;

test("teacher builds a word list from CSV, publishes it and assigns a group", async ({ page }) => {
  await login(page, "t.rahimov");
  await page.goto("/teacher/vocabulary");
  await page.getByRole("button", { name: "Yangi ro‘yxat" }).first().click();
  await page.getByRole("dialog").getByLabel("Nomi").fill(LIST);
  await page.getByRole("dialog").getByRole("button", { name: "Yaratish" }).click();
  await expect(page).toHaveURL(/\/teacher\/vocabulary\/[0-9a-f-]{36}$/);
  // An empty list opens the bulk-entry window straight away.
  await page.getByLabel("So‘zlar ro‘yxati").fill("1. apple - olma | I eat an apple.\nbread — non\nwater: suv\napple - olma\n");
  await expect(page.getByRole("cell", { name: "bread" })).toBeVisible();
  await expect(page.getByText(/Takroriy \(o‘tkazib yuboriladi\): apple/)).toBeVisible();
  await page.getByRole("button", { name: "3 ta so‘zni qo‘shish" }).click();
  await expect(page.getByText("So‘zlar (3)").first()).toBeVisible();
  await page.getByRole("button", { name: "E’lon qilish" }).click();
  await expect(page.getByText("E’lon qilingan").first()).toBeVisible();
  await page.getByRole("link", { name: "Biriktirish" }).click();
  await page.getByRole("checkbox", { name: /^Intermediate ·/ }).check();
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText("Saqlandi")).toBeVisible();
});

test("student studies the new words with flashcards and typing", async ({ page }) => {
  await login(page, "jasur.toshmatov");
  await page.goto("/vocabulary");
  await expect(page.getByRole("link", { name: new RegExp(LIST) })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(LIST) }).click();
  await page.getByRole("link", { name: /Kartochkalar/ }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Tarjimani ko‘rsatish" }).click();
    await page.getByRole("button", { name: "Esladim", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Mashg‘ulot yakunlandi" })).toBeVisible();
  await expect(page.getByText("3 ta javob · 100% to‘g‘ri")).toBeVisible();
  await page.goto("/vocabulary");
  await expect(page.getByText("O‘rganilgan").first()).toBeVisible();
  await logout(page);

  await login(page, "t.rahimov");
  await page.goto("/teacher/vocabulary");
  await page.getByText(LIST).click();
  await page.getByRole("link", { name: "Faollik" }).click();
  await expect(page.getByRole("row", { name: /Jasur Toshmatov/ })).toContainText("100%");
});

test("student plays the word game to the end", async ({ page }) => {
  await login(page, "nigora.aliyeva");
  await page.goto("/vocabulary/game");
  await page.getByRole("button", { name: "Boshlash" }).click();
  for (let i = 0; i < 12; i++) {
    const tile = page.locator("button.min-h-24:enabled").first();
    if (!(await tile.isVisible().catch(() => false))) break;
    await tile.click();
    await page.waitForTimeout(1500);
  }
  await expect(page.getByRole("button", { name: /Yana o‘ynash/ })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Ball", { exact: true })).toBeVisible();
});
