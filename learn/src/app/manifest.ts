import type { MetadataRoute } from "next";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = "Everest Ta’lim";
  let short = "Everest";
  try {
    const s = await getSettings();
    name = s.branding.appName;
    short = s.branding.shortName;
  } catch {
    /* database unavailable at build time — use defaults */
  }
  return {
    id: "/",
    name,
    short_name: short,
    description: "Vazifalar, quizlar, baholar va shaxsiy natijalar — bir joyda.",
    lang: "uz",
    dir: "ltr",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f5f6f3",
    theme_color: "#0f7a5a",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Vazifalar", url: "/assignments", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Quizlar", url: "/quizzes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Natijalar", url: "/results", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
