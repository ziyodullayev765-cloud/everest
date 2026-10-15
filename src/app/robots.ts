import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data/public";
import { env } from "@/lib/env";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();
  const base = (settings.site_url || env.siteUrl).replace(/\/+$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
