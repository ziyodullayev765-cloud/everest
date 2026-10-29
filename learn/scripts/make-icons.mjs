/**
 * Builds the home-screen icons from scripts/assets/app-icon.jpg (a city skyline picture):
 * a centred square crop, resized for every slot. The picture is full-bleed, so the same image
 * works as "any", "maskable" and the iOS apple-touch-icon. Run: node scripts/make-icons.mjs
 */
import sharp from "sharp";

const src = new URL("./assets/app-icon.jpg", import.meta.url).pathname;
const out = new URL("../public/icons/", import.meta.url).pathname;
const { width, height } = await sharp(src).metadata();
const side = Math.min(width, height);
// Keep the two tallest towers in the middle of the icon.
const left = Math.round(Math.max(0, Math.min(width - side, width * 0.52 - side / 2)));
const square = await sharp(src).extract({ left, top: 0, width: side, height: side }).png().toBuffer();

for (const [name, size] of [["icon-192", 192], ["icon-512", 512], ["maskable-192", 192], ["maskable-512", 512], ["apple-touch-icon", 180]])
  await sharp(square).resize(size, size).png({ palette: true, quality: 90, effort: 10 }).toFile(`${out}${name}-city.png`);
