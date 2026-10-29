import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";

test.describe.configure({ mode: "serial" });
const TITLE = `Import E2E ${Date.now().toString(36)}`;

test("admin imports a CSV with a bad row into a new set for one group", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin/vocabulary");
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: /Fayldan import/ }).first().click();
  await expect(page.getByRole("heading", { name: "Lug‘at importi" })).toBeVisible();
  await page.getByRole("radio", { name: "Yangi ro‘yxat" }).click();
  await page.getByLabel("Nomi").fill(TITLE);
  await page.getByRole("checkbox", { name: /Intermediate/ }).check();
  const csv = "Word;Tarjima;Example\nharbour;port, bandargoh;Ships wait in the harbour.\nlighthouse;mayoq;\n;bo‘sh;missing word\nharbour;port;again\n";
  await page.locator('input[type="file"]').setInputFiles({ name: "port.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByText(/4 qator topildi/)).toBeVisible();
  await expect(page.getByRole("tab", { name: /Yangi · 2/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Xato · 1/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Faylda takror · 1/ })).toBeVisible();
  await page.getByRole("button", { name: "2 ta so‘zni import qilish" }).click();
  await expect(page).toHaveURL(/\/admin\/vocabulary\/imports\/[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { name: `Import: ${TITLE}` })).toBeVisible();
  await expect(page.getByText("Yozilmagan qatorlar")).toBeVisible();
  await expect(page.getByRole("cell", { name: /Inglizcha so‘z/ })).toBeVisible();
});

test("only the assigned group sees the imported set", async ({ page }) => {
  await login(page, "ali.valiyev"); // Intermediate
  await page.goto("/vocabulary");
  await expect(page.getByText(TITLE)).toBeVisible();
  await logout(page);
  await login(page, "sardor.qodirov"); // Elementary
  await page.goto("/vocabulary");
  await expect(page.getByText(TITLE)).toHaveCount(0);
});

test("admin finds the set by group filter and undoes the import", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin/vocabulary/imports");
  await page.waitForLoadState("networkidle");
  await page.getByRole("row", { name: new RegExp(TITLE) }).getByRole("link").first().click();
  await page.getByRole("button", { name: "Bekor qilish" }).click();
  await page.getByRole("button", { name: "Ha, bekor qilish" }).click();
  await expect(page.getByText("Bekor qilingan").first()).toBeVisible();
  await page.getByRole("link", { name: "Ro‘yxatni ochish" }).click();
  await expect(page.getByText("Hali so‘z yo‘q.")).toBeVisible();
});
