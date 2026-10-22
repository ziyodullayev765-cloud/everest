"use client";
/**
 * Offline helpers for the installed app.
 *  - App files: the service worker downloads the whole build in the background ("WARM");
 *    pages listen for its progress messages.
 *  - Saved books: a student can keep a book's PDF/audio on this device. Files go into the
 *    "everest-files" cache (the worker serves them, with byte ranges) and are removed on logout.
 */
export const FILES_CACHE = "everest-files";
const fileKey = (id: string) => `/api/files/${id}`;

export type WarmState = { done: number; total: number; finished: boolean };
let warm: WarmState | null = null;
const listeners = new Set<(s: WarmState) => void>();

export function onWarm(cb: (s: WarmState) => void) {
  listeners.add(cb);
  if (warm) cb(warm);
  return () => void listeners.delete(cb);
}

/** Called once by the service-worker registrar. */
export function startWarm() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("message", (e) => {
    const d = e.data as { type?: string; done?: number; total?: number };
    if (d?.type === "WARM_PROGRESS") warm = { done: d.done ?? 0, total: d.total ?? 0, finished: false };
    else if (d?.type === "WARM_DONE") warm = { done: d.total ?? 0, total: d.total ?? 0, finished: true };
    else return;
    for (const l of listeners) l(warm);
  });
  navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: "WARM" })).catch(() => {});
  // Ask the browser not to evict the app's files when the phone runs low on space.
  if (matchMedia("(display-mode: standalone)").matches) navigator.storage?.persist?.().catch(() => {});
}

export const offlineSupported = () => typeof caches !== "undefined" && "serviceWorker" in navigator;

export async function savedFileIds(): Promise<Set<string>> {
  if (!offlineSupported()) return new Set();
  const c = await caches.open(FILES_CACHE);
  return new Set((await c.keys()).map((r) => new URL(r.url).pathname.split("/").pop()!));
}

/** Downloads files fully and keeps them on the device. Reports bytes as they arrive. */
export async function saveFiles(files: { id: string; size: number }[], onProgress?: (loaded: number, total: number) => void) {
  const c = await caches.open(FILES_CACHE);
  const total = files.reduce((s, f) => s + (f.size || 0), 0);
  let loaded = 0;
  navigator.storage?.persist?.().catch(() => {});
  for (const f of files) {
    if (await c.match(fileKey(f.id))) {
      loaded += f.size;
      onProgress?.(loaded, total);
      continue;
    }
    const res = await fetch(fileKey(f.id), { credentials: "same-origin" });
    if (!res.ok || !res.body) throw new Error("Faylni yuklab bo‘lmadi. Internetni tekshiring.");
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      onProgress?.(loaded, total);
    }
    const blob = new Blob(chunks as BlobPart[], { type: res.headers.get("Content-Type") ?? "application/octet-stream" });
    await c.put(fileKey(f.id), new Response(blob, { headers: { "Content-Type": blob.type, "Content-Length": String(blob.size), "Accept-Ranges": "bytes" } }));
  }
}

export async function removeFiles(ids: string[]) {
  const c = await caches.open(FILES_CACHE);
  await Promise.all(ids.map((id) => c.delete(fileKey(id))));
}

/** Logout: saved books belong to this account only. */
export function clearSavedFiles() {
  try {
    if (typeof caches !== "undefined") void caches.delete(FILES_CACHE);
  } catch {}
}
