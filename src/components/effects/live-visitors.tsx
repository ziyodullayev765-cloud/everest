"use client";

import { useEffect, useState } from "react";
import { useCopy } from "@/components/i18n/provider";
import { env } from "@/lib/env";

/**
 * "3 people here right now" via Supabase Realtime presence. Nothing is stored:
 * each open tab joins a channel with a random key and leaves when closed. The
 * client library is loaded only after the page is idle, so it never slows the
 * first paint. Hidden when Realtime is unavailable.
 */
export function LiveVisitors() {
  const copy = useCopy();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!env.supabaseUrl || !env.supabaseAnonKey || navigator.webdriver) return;
    let cleanup = () => {};
    let cancelled = false;
    const start = async () => {
      const { createClient } = await import("@supabase/supabase-js");
      if (cancelled) return;
      const client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const channel = client.channel("site-presence", { config: { presence: { key: crypto.randomUUID() } } });
      channel
        .on("presence", { event: "sync" }, () => setCount(Object.keys(channel.presenceState()).length))
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void channel.track({});
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setCount(null);
        });
      cleanup = () => {
        void client.removeChannel(channel);
      };
    };
    const id =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(() => void start(), { timeout: 4000 })
        : window.setTimeout(() => void start(), 1500);
    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(id as number);
      else clearTimeout(id as number);
      cleanup();
    };
  }, []);

  if (!count) return null;
  const text = count > 1 ? copy.presence.many.replace("{n}", String(count)) : copy.presence.one;
  return (
    <p className="text-muted inline-flex items-center gap-2 text-[0.78rem]" aria-live="polite">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
      </span>
      {text}
    </p>
  );
}
