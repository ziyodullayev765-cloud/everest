/**
 * Renders the Everest mark to PNG app icons with the bundled Chromium (Playwright).
 * Run: npm run icons   → public/icons/*.png
 *  - icon-192/512: rounded mark on transparent background ("any" purpose)
 *  - maskable-512: full-bleed background, artwork inside the 80% safe zone
 *  - apple-touch-icon (180): opaque, iOS applies its own mask
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const GREEN = "#0f7a5a";
const peaks = (fg, bg) => `
  <path d="M9 35 L20.5 17 L27 27 L31 21.5 L39 35 Z" fill="${fg}" opacity="0.38"/>
  <path d="M13 35 L24 15.5 L35 35 Z" fill="${fg}"/>
  <path d="M24 15.5 L24 9.5 L29.5 11.6 L24 13.6" fill="none" stroke="${fg}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M19.4 23.6 L24 20.4 L28.6 23.6" fill="none" stroke="${bg}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;

const any = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="${GREEN}"/>${peaks("#fff", GREEN)}</svg>`;
const full = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="${GREEN}"/><g transform="translate(24 24) scale(${scale}) translate(-24 -23)">${peaks("#fff", GREEN)}</g></svg>`;

const out = "public/icons";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
async function render(svg, size, file, transparent = true) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: `${out}/${file}`, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  console.log("✓", file);
}
await render(any, 32, "favicon-32.png");
await render(any, 192, "icon-192.png");
await render(any, 512, "icon-512.png");
await render(full(0.72), 512, "maskable-512.png", false);
await render(full(0.72), 192, "maskable-192.png", false);
await render(full(0.9), 180, "apple-touch-icon.png", false);
await browser.close();
