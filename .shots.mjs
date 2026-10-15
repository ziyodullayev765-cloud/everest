import { chromium } from "playwright";
const S = process.argv[2];
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const pages = process.argv[3].split(",");
const modes = [["d", { width: 1440, height: 900 }, "dark"], ["m", { width: 390, height: 844 }, "light"]];
for (const [tag, vp, scheme] of modes) {
  const ctx = await b.newContext({ viewport: vp, colorScheme: scheme });
  const p = await ctx.newPage();
  for (const path of pages) {
    await p.goto("http://localhost:3000" + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(2500);
    await p.evaluate(() => document.querySelectorAll(".ed-section").forEach((e) => (e.dataset.visible = "true")));
    await p.waitForTimeout(1300);
    const name = path === "/" ? "home" : path.slice(1).replace(/\//g, "_");
    await p.screenshot({ path: `${S}/aud-${tag}-${name}.png`, fullPage: true });
  }
  await ctx.close();
}
await b.close();
