import { themeInitScript } from "@/lib/theme-script";
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { getProfile, getSettings } from "@/lib/data/public";
import { ownerName, seoDescription, seoTitle } from "@/lib/defaults";
import { env } from "@/lib/env";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const [s, profile] = await Promise.all([getSettings(), getProfile()]);
  const base = s.site_url || env.siteUrl;
  const name = ownerName(profile, s);
  const title = seoTitle(s, name);
  const description = seoDescription(s, name);
  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s — ${name}` },
    description,
    keywords: s.seo_keywords.length ? s.seo_keywords : undefined,
    applicationName: name,
    authors: [{ name }],
    alternates: { canonical: "/" },
    icons: s.favicon_url ? { icon: s.favicon_url } : { icon: "/brand-icon?size=64", apple: "/brand-icon?size=180" },
    openGraph: {
      type: "website",
      siteName: name,
      title,
      description,
      url: "/",
      locale: "en_US",
      images: [{ url: s.og_image_url || "/og", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [s.og_image_url || "/og"],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      style={{ ["--accent" as string]: settings.accent_color }}
      // The theme script adds the "light" class before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
