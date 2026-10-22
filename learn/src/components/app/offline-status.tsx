"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { onWarm, type WarmState } from "@/lib/offline";
import { tr } from "@/lib/i18n/tr";

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

/** Shows whether the app's own files are on the device (downloaded in the background by the worker). */
export function OfflineStatus() {
  const [s, setS] = useState<WarmState | null>(null);
  const [used, setUsed] = useState<number | null>(null);
  useEffect(() => onWarm(setS), []);
  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsed(e.usage ?? null)).catch(() => {});
  }, [s?.finished]);
  if (!s || !s.total) return null;
  const ready = s.finished || s.done >= s.total;
  return (
    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5 text-[13px] font-semibold">
      {ready ? <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden /> : <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />}
      <span>
        {ready ? tr("Ilova fayllari telefonga yuklangan — tez ochiladi") : `Ilova fayllari yuklanmoqda: ${s.done}/${s.total}`}
        {ready && used ? <span className="text-muted"> · {mb(used)}</span> : null}
      </span>
    </div>
  );
}
