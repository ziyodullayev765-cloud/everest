"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { RefreshCw, WifiOff } from "lucide-react";

/** Registers /sw.js (production only) and offers a reload when a new version is waiting. */
export function ServiceWorkerRegistrar() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw?.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) setWaiting(nw);
        });
      });
      const t = setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      return () => clearInterval(t);
    });
  }, []);
  if (!waiting) return null;
  return (
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-[80] flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm shadow-pop">
        <RefreshCw className="size-4 text-primary" aria-hidden />
        Yangi versiya tayyor
        <button className="rounded-lg bg-primary px-3 py-1 text-[13px] font-medium text-primary-fg" onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}>
          Yangilash
        </button>
      </div>
    </div>
  );
}

const subscribe = (cb: () => void) => {
  addEventListener("online", cb);
  addEventListener("offline", cb);
  return () => {
    removeEventListener("online", cb);
    removeEventListener("offline", cb);
  };
};
export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

export function OfflineIndicator() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[75] pt-safe">
      <div className="mx-auto flex w-fit items-center gap-2 rounded-b-xl bg-text px-4 py-2 text-[13px] font-medium text-bg shadow-pop" role="status">
        <WifiOff className="size-4" aria-hidden />
        Internet aloqasi yo‘q — saqlash va topshirish aloqa tiklanganda ishlaydi
      </div>
    </div>
  );
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let deferred: BIPEvent | null = null;
const bipListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    bipListeners.forEach((l) => l());
  });
  addEventListener("appinstalled", () => {
    deferred = null;
    bipListeners.forEach((l) => l());
  });
}

export type Platform = "ios" | "android" | "desktop" | "other";

export function detectPlatform(): { platform: Platform; standalone: boolean; iosSafari: boolean } {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  const iosSafari = ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return { platform: ios ? "ios" : android ? "android" : /Windows|Macintosh|Linux|CrOS/.test(ua) ? "desktop" : "other", standalone, iosSafari };
}

/** The browser's own install prompt, when (and only when) the browser offers one. */
export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    bipListeners.add(l);
    return () => void bipListeners.delete(l);
  }, []);
  return {
    available: !!deferred,
    prompt: async () => {
      if (!deferred) return "unavailable" as const;
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      force((n) => n + 1);
      return outcome;
    },
  };
}
