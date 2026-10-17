"use client";

import { useEffect, useState } from "react";

/** "Now — Building Yo‘lda · 14:05 in Tashkent". The clock ticks every 20 s. */
export function NowLine({ text, label, tashkent }: { text: string; label: string; tashkent: string }) {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mx-auto w-[min(1200px,calc(100%-2rem))] py-6">
      <p className="border-line flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border px-5 py-4 text-[var(--fg-secondary)]">
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.18em] text-[var(--name-tint)] uppercase">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--name-tint)] opacity-50 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--name-tint)]" />
          </span>
          {label}
        </span>
        <span className="text-fg min-w-0 flex-1">{text}</span>
        {time && (
          <span className="text-subtle font-mono text-xs tabular-nums">
            {time} {tashkent}
          </span>
        )}
      </p>
    </div>
  );
}
