import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
import "katex/dist/katex.min.css";
import "./globals.css";
import { themeScript } from "@/components/app/theme";
import { NoZoom, OfflineIndicator, ServiceWorkerRegistrar } from "@/components/app/pwa";
import { Toaster } from "@/components/ui/toast";

/** Rounded, friendly typeface (self-hosted; latin subset covers Uzbek Latin incl. ʻ and ‘). */
const nunito = localFont({
  src: "../../node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2",
  weight: "200 1000",
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Everest Ta’lim", template: "%s · Everest" },
  description: "O‘quvchilar, o‘qituvchilar va ma’muriyat uchun zamonaviy ta’lim platformasi",
  applicationName: "Everest Ta’lim",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Everest", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#131f24" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning className={`${nunito.variable} ${GeistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        {children}
        <NoZoom />
        <OfflineIndicator />
        <ServiceWorkerRegistrar />
        <Toaster />
      </body>
    </html>
  );
}
