"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; tone: "success" | "error" | "info"; message: string };
let seq = 0;
const listeners = new Set<(t: Toast) => void>();

export const toast = {
  success: (message: string) => emit("success", message),
  error: (message: string) => emit("error", message),
  info: (message: string) => emit("info", message),
};
function emit(tone: Toast["tone"], message: string) {
  const t = { id: ++seq, tone, message };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (t: Toast) => {
      setItems((xs) => [...xs.slice(-2), t]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), t.tone === "error" ? 6000 : 3500);
    };
    listeners.add(on);
    return () => void listeners.delete(on);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(112px+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      {items.map((t) => {
        const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? XCircle : Info;
        return (
          <div key={t.id} className="pointer-events-auto flex max-w-md animate-fade-up items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text shadow-pop" role={t.tone === "error" ? "alert" : "status"}>
            <Icon className={cn("size-4 shrink-0", t.tone === "success" ? "text-success" : t.tone === "error" ? "text-danger" : "text-info")} aria-hidden />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
