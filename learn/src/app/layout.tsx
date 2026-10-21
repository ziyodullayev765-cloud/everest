import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "katex/dist/katex.min.css";
import "./globals.css";
import { themeScript } from "@/components/app/theme";
import { NoZoom, OfflineIndicator, ServiceWorkerRegistrar } from "@/components/app/pwa";
import { Toaster } from "@/components/ui/toast";

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
    { media: "(prefers-color-scheme: light)", color: "#f5f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0b100d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
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
