"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/app/admin/actions/push";
import { Button, Card } from "./ui";

type State = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/admin/" });
}

/**
 * Turns browser push notifications on or off for this device. On iPhone and
 * iPad, web push only works once the admin panel is added to the Home Screen.
 */
export function PushToggle({ publicKey, configured }: { publicKey: string; configured: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      const ios =
        /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      if (!supported) return setState(ios && !standalone ? "install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const res = await savePushSubscription(sub.toJSON(), navigator.userAgent);
      if (!res.ok) throw new Error(res.error);
      setState("on");
      toast.success(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not turn notifications on.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Notifications are off for this device.");
    } catch {
      toast.error("Could not turn notifications off.");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    const res = await sendTestPush();
    setBusy(false);
    if (res.ok) toast.success(res.message);
    else toast.error(res.error);
  };

  const text: Record<State, string> = {
    loading: "Checking this device…",
    unsupported: "This browser can't show push notifications. Try Chrome, Edge, Firefox or Safari.",
    install:
      "On iPhone and iPad: open this page in Safari, tap Share → “Add to Home Screen”, then open the admin from the new icon and turn notifications on there.",
    denied: "Notifications are blocked for this site. Allow them in your browser's site settings, then reload.",
    off: "Get a notification on this device whenever someone sends a message through the contact form.",
    on: "This device gets a notification for every new message.",
  };

  return (
    <Card className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="bg-accent/12 text-accent grid size-10 shrink-0 place-items-center rounded-xl">
          {state === "install" ? (
            <Smartphone className="size-5" aria-hidden />
          ) : state === "on" ? (
            <Bell className="size-5" aria-hidden />
          ) : (
            <BellOff className="size-5" aria-hidden />
          )}
        </span>
        <div>
          <p className="font-medium">Push notifications</p>
          <p className="text-muted mt-0.5 text-sm" aria-live="polite">
            {configured ? text[state] : "Push isn't configured on the server yet (VAPID keys missing)."}
          </p>
        </div>
      </div>
      {configured && (
        <div className="flex shrink-0 flex-wrap gap-2">
          {state === "loading" && <Loader2 className="text-muted size-4 animate-spin" aria-hidden />}
          {state === "off" && (
            <Button variant="primary" onClick={enable} loading={busy}>
              <Bell className="size-4" aria-hidden /> Turn on
            </Button>
          )}
          {state === "on" && (
            <>
              <Button onClick={test} loading={busy}>
                <Send className="size-4" aria-hidden /> Send test
              </Button>
              <Button variant="ghost" onClick={disable} disabled={busy}>
                Turn off
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
