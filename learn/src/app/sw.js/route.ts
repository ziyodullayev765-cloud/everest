/**
 * Service worker, served from /sw.js with a per-build version so every deploy rotates the cache.
 * Policy (see README → PWA):
 *  - Precache only the offline page and public icons.
 *  - Cache-first for hashed, immutable public assets (/_next/static, /icons).
 *  - Pages and /api are NEVER cached: they contain private, per-user data. Navigations that fail
 *    offline fall back to /offline.
 */
export const dynamic = "force-static";

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? process.env.BUILD_ID ?? String(Date.now());

const source = `
const VERSION = ${JSON.stringify(VERSION)};
const CACHE = "everest-static-" + VERSION;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(async () => (await caches.match("/offline")) || new Response("Offline", { status: 503 })));
  }
  // Everything else (API, files, RSC payloads) goes straight to the network and is never stored.
});
`;

export function GET() {
  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
