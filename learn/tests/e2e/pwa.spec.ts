import { expect, test } from "@playwright/test";

test("manifest is valid and icons exist", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.display).toBe("standalone");
  expect(m.start_url).toBeTruthy();
  expect(m.lang).toBe("uz");
  const sizes = m.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  for (const i of m.icons) expect((await request.get(i.src)).headers()["content-type"]).toContain("image/png");
  expect((await request.get("/icons/apple-touch-icon.png")).ok()).toBe(true);
});

test("service worker registers and the offline page is precached", async ({ page, context }) => {
  await page.goto("/login");
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.scriptURL ?? null;
  });
  expect(sw).toContain("/sw.js");
  await context.setOffline(true);
  await page.goto("/install").catch(() => {});
  await expect(page.getByText("Internet aloqasi yo‘q").first()).toBeVisible();
  await context.setOffline(false);
});

test("service worker never caches private pages or API responses", async ({ request }) => {
  const sw = await (await request.get("/sw.js")).text();
  expect(sw).toContain("never stored");
  expect(sw).not.toMatch(/cache\.put\([^)]*api/);
});
