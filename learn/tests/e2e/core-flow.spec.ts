import { expect, test } from "@playwright/test";
import { login, logout } from "./helpers";

test.describe.configure({ mode: "serial" });

const TITLE = `E2E insho ${Date.now().toString(36)}`;

test("admin creates and publishes an assignment for 7-A", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin/assignments/new");
  await page.getByLabel("Sarlavha").fill(TITLE);
  await page.getByLabel("Ko‘rsatmalar").fill("Yozgi ta’til haqida 5 gap yozing.");
  await page.getByLabel("Maksimal ball").fill("10");
  await page.getByRole("checkbox", { name: /7-A/ }).check();
  await page.getByRole("button", { name: "E’lon qilish" }).last().click();
  await expect(page).toHaveURL(/\/admin\/assignments\/[0-9a-f-]{36}/);
  await expect(page.getByText("E’lon qilingan").first()).toBeVisible();
});

test("the assignment is visible to a 7-A student but not to a 7-B student", async ({ page }) => {
  await login(page, "sardor.qodirov"); // 7-B
  await page.goto("/assignments");
  await expect(page.getByText(TITLE)).toHaveCount(0);
  await logout(page);
  await login(page, "ali.valiyev"); // 7-A
  await page.goto("/assignments");
  await expect(page.getByText(TITLE)).toBeVisible();
});

test("student submits the work and gets a confirmation", async ({ page }) => {
  await login(page, "ali.valiyev");
  await page.goto("/assignments");
  await page.getByText(TITLE).click();
  await page.getByRole("link", { name: /Bajarishni boshlash/ }).click();
  await page.getByLabel("Javobingiz").fill("Yozda men buvimnikiga bordim. Daryoda suzdim. Kitob o‘qidim. Do‘stlarim bilan futbol o‘ynadim. Juda maroqli o‘tdi.");
  await page.getByRole("button", { name: "Topshirish" }).click();
  await page.getByRole("button", { name: "Ha, topshirish" }).click();
  await expect(page.getByRole("heading", { name: "Ishingiz topshirildi" })).toBeVisible();
  // Can't change it afterwards.
  await page.getByRole("link", { name: "Vazifani ko‘rish" }).click();
  await expect(page.getByText("Topshirildi").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Qayta topshirish|Bajarishni boshlash/ })).toHaveCount(0);
});

test("teacher grades it and the student sees the final grade with feedback", async ({ page }) => {
  await login(page, "t.saidova"); // teaches English in 7-A only — not this admin-created Math work's subject scope
  await page.goto("/teacher/submissions");
  await expect(page.getByText(TITLE)).toHaveCount(0);
  await logout(page);

  await login(page, "t.rahimov");
  await page.goto("/teacher/submissions");
  await page.getByText(TITLE).first().click();
  await page.getByLabel("Ball").fill("9");
  await page.getByLabel("Izoh o‘quvchiga").fill("Juda yaxshi, imloga e’tibor bering.");
  await page.getByRole("button", { name: "Yakunlash va e’lon qilish" }).click();
  await expect(page.getByText("Yakuniy").first()).toBeVisible();
  await logout(page);

  await login(page, "ali.valiyev");
  await page.goto("/grades");
  await expect(page.getByText(TITLE)).toBeVisible();
  await page.getByText(TITLE).click();
  await expect(page.getByText("Juda yaxshi, imloga e’tibor bering.")).toBeVisible();
  await expect(page.getByText("Yakuniy").first()).toBeVisible();
  await expect(page.locator("text=/^9$/").first()).toBeVisible();
  await page.goto("/notifications");
  await expect(page.getByText(new RegExp(`Baho e’lon qilindi: ${TITLE}`))).toBeVisible();
});

test("student takes a quiz and sees the automatic score", async ({ page }) => {
  await login(page, "madina.usmonova");
  await page.goto("/quizzes");
  await page.getByText("Mashq: o‘nli kasrlar").click();
  await page.getByRole("button", { name: "Quizni boshlash" }).click();
  await expect(page).toHaveURL(/\/attempt\//);
  // Q1/Q2 order is fixed (no shuffling for this practice set).
  await page.getByRole("radio", { name: /0,7/ }).click();
  await expect(page.getByText("Saqlandi")).toBeVisible();
  await page.getByRole("button", { name: "Keyingi" }).click();
  await page.getByRole("textbox", { name: "Javob", exact: true }).fill("1");
  await page.getByRole("button", { name: "Yakunlash" }).click();
  await page.getByRole("button", { name: "Ha, topshirish" }).click();
  await expect(page).toHaveURL(/\/results\//);
  await expect(page.getByText("100%").first()).toBeVisible();
  await expect(page.getByText("2 to‘g‘ri")).toBeVisible();
});

test("results page reflects the saved work", async ({ page }) => {
  await login(page, "ali.valiyev");
  await page.goto("/results?r=7");
  await expect(page.getByText("Haftalik hisobot")).toBeVisible();
  await expect(page.getByText("90%").first()).toBeVisible();
});
