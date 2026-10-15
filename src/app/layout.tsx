import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { getSettings } from "@/lib/data/public";
import { env } from "@/lib/env";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const base = s.site_url || env.siteUrl;
  const title = s.seo_title || s.site_name;
  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s — ${s.site_name}` },
    description: s.seo_description || undefined,
    keywords: s.seo_keywords.length ? s.seo_keywords : undefined,
    applicationName: s.site_name,
    authors: [{ name: s.site_name }],
    alternates: { canonical: "/" },
    icons: s.favicon_url ? { icon: s.favicon_url } : undefined,
    openGraph: {
      type: "website",
      siteName: s.site_name,
      title,
      description: s.seo_description || undefined,
      url: "/",
      locale: "uz_UZ",
      images: s.og_image_url ? [{ url: s.og_image_url, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: s.og_image_url ? "summary_large_image" : "summary",
      title,
      description: s.seo_description || undefined,
      images: s.og_image_url ? [s.og_image_url] : undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#050506",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html
      lang="uz"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      style={{ ["--accent" as string]: settings.accent_color }}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
