#!/usr/bin/env node
/**
 * Downloads the Higgsfield-generated brand artwork and writes optimised copies
 * into public/brand/. Re-run after generating new artwork (update URLS below).
 *
 *   npm run brand:fetch
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const URLS = {
  // Social sharing card background (16:9, sculpture on the right, empty left side for text)
  "og-background":
    "https://d8j0ntlcm91z4.cloudfront.net/user_3K5YZMmsFYtz6mgp5ggBpvkIwix/hf_20261015_105325_91e56a6e-a79b-4714-8a11-716cdf0c7adf.png",
  // Ultra-wide ambient emerald aurora used behind the home-page contact section
  ambient:
    "https://d8j0ntlcm91z4.cloudfront.net/user_3K5YZMmsFYtz6mgp5ggBpvkIwix/hf_20261015_105253_3584d250-5fa1-40de-aa4c-4461f7b87293.png",
};

const outDir = path.resolve("public/brand");
mkdirSync(outDir, { recursive: true });

for (const [name, url] of Object.entries(URLS)) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const width = name === "og-background" ? 1200 : 2400;
  const height = name === "og-background" ? 630 : undefined;
  const out = await sharp(input)
    .resize({ width, height, fit: "cover", position: "right" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  writeFileSync(path.join(outDir, `${name}.jpg`), out);
  console.log(`✔ public/brand/${name}.jpg (${Math.round(out.length / 1024)} KB)`);
}
