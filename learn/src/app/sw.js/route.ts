import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Service worker, served from /sw.js (see README → PWA).
 *  - Install precaches the offline page and icons. Right after, every file of the current build
 *    (/_next/static: scripts, styles, fonts, the PDF engine) is downloaded in the background,
 *    so the installed app opens and moves between screens without waiting on the network.
 *  - Hashed build files are immutable: the cache survives deploys and an update only fetches
 *    what changed; files no longer in the build are pruned afterwards.
 *  - Pages and /api responses are never stored by the worker: they hold private, per-user data.
 *    The only exception is a book the student explicitly saves for offline use from the page
 *    itself ("everest-files" cache, filled by the page, cleared on logout); the worker only reads it.
 *    Navigations that fail offline fall back to /offline.
 */
export const dynamic = "force-static";

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? process.env.BUILD_ID ?? String(Date.now());

/** Every file the build emitted under .next/static (read at build time). */
function buildAssets(): string[] {
  const root = join(process.cwd(), ".next", "static");
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (!name.endsWith(".map")) out.push("/_next/static/" + relative(root, p).split(sep).join("/"));
    }
  };
  try {
    walk(root);
  } catch {
    return [];
  }
  return out.sort();
}

const source = (assets: string[]) => `
const VERSION = ${JSON.stringify(VERSION)};
const SHELL = "everest-shell-" + VERSION;
const STATIC = "everest-static";
const FILES = "everest-files";
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];
const ASSETS = ${JSON.stringify(assets)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== SHELL && key !== STATIC && key !== FILES) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

async function broadcast(msg) {
  for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage(msg);
}

let warming = null;
/** Downloads the build's files that aren't cached yet (4 at a time), then prunes old ones. */
function warm() {
  warming ??= (async () => {
    const cache = await caches.open(STATIC);
    const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
    const todo = ASSETS.filter((a) => !have.has(a));
    let done = ASSETS.length - todo.length;
    await broadcast({ type: "WARM_PROGRESS", done, total: ASSETS.length });
    let i = 0;
    const worker = async () => {
      while (i < todo.length) {
        const url = todo[i++];
        try {
          const res = await fetch(url, { priority: "low" });
          if (res.ok) await cache.put(url, res);
        } catch {}
        done++;
        if (done % 10 === 0 || done === ASSETS.length) await broadcast({ type: "WARM_PROGRESS", done, total: ASSETS.length });
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    if (ASSETS.length) {
      const keep = new Set(ASSETS);
      for (const r of await cache.keys()) if (!keep.has(new URL(r.url).pathname)) await cache.delete(r);
    }
    await broadcast({ type: "WARM_DONE", total: ASSETS.length });
  })().finally(() => (warming = null));
  return warming;
}

self.addEventListener("message", (event) => {
  const t = event.data && event.data.type;
  if (t === "SKIP_WAITING") self.skipWaiting();
  if (t === "WARM") event.waitUntil(warm());
});

/** Serves a byte range from a saved file, so audio can seek and the PDF reader can page offline. */
async function withRange(res, range) {
  const m = range && /bytes=(\\d*)-(\\d*)/.exec(range);
  if (!m) return res;
  const blob = await res.blob();
  const size = blob.size;
  let start = m[1] === "" ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  let end = m[1] !== "" && m[2] !== "" ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + size } });
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/octet-stream",
      "Content-Range": "bytes " + start + "-" + end + "/" + size,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith((async () => {
      const hit = await caches.match(url.pathname);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === "basic") {
        const copy = res.clone();
        event.waitUntil(caches.open(STATIC).then((c) => c.put(url.pathname, copy)));
      }
      return res;
    })());
    return;
  }

  if (url.pathname.startsWith("/api/files/")) {
    event.respondWith((async () => {
      const saved = await (await caches.open(FILES)).match(url.pathname);
      if (saved) return withRange(saved, req.headers.get("range"));
      return fetch(req);
    })());
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(async () => (await caches.match("/offline")) || new Response("Offline", { status: 503 })));
  }
  // Everything else (API, RSC payloads) goes straight to the network and is never stored.
});
`;

export function GET() {
  return new Response(source(buildAssets()), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
