import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Optional generated artwork in public/brand/ (see scripts/fetch-brand-assets.mjs).
 * Every consumer must keep working when a file is absent.
 */
const dir = path.join(process.cwd(), "public", "brand");

export function brandAssetUrl(file: string): string | null {
  return existsSync(path.join(dir, file)) ? `/brand/${file}` : null;
}

export function brandAssetDataUrl(file: string, mime = "image/jpeg"): string | null {
  const p = path.join(dir, file);
  if (!existsSync(p)) return null;
  return `data:${mime};base64,${readFileSync(p).toString("base64")}`;
}
