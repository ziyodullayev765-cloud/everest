import type { MetadataRoute } from "next";
import { getProjects, getSettings } from "@/lib/data/public";
import { env } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, projects] = await Promise.all([getSettings(), getProjects()]);
  const base = (settings.site_url || env.siteUrl).replace(/\/+$/, "");
  const now = new Date();
  const pages = ["", "/about", "/projects", "/achievements", "/skills", "/experience", "/gallery", "/contact", "/privacy"];
  return [
    ...pages.map((p) => ({
      url: `${base}${p}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: p === "" ? 1 : 0.7,
    })),
    ...projects.map((p) => ({
      url: `${base}/projects/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
