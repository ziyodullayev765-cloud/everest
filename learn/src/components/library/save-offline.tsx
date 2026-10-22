"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, CloudDownload, Loader2, Trash2 } from "lucide-react";
import { offlineSupported, removeFiles, savedFileIds, saveFiles } from "@/lib/offline";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

/** Keeps a book's PDF and audio on this device so it opens and plays without internet. */
export function SaveOffline({ files }: { files: { id: string; size: number }[] }) {
  const [state, setState] = useState<"unknown" | "none" | "saved" | "saving">("unknown");
  const [pct, setPct] = useState(0);
  const total = files.reduce((s, f) => s + (f.size || 0), 0);

  useEffect(() => {
    if (!offlineSupported()) return;
    savedFileIds().then((ids) => setState(files.every((f) => ids.has(f.id)) ? "saved" : "none"));
  }, [files]);

  if (!files.length || state === "unknown") return null;
  if (state === "saved")
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-primary/30 bg-primary-soft px-3 py-2 text-[13.5px] font-bold text-primary">
        <CheckCircle2 className="size-4" aria-hidden /> Telefonda saqlangan — internetsiz ochiladi
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-danger"
          onClick={async () => {
            await removeFiles(files.map((f) => f.id));
            setState("none");
            toast.success("Telefondan o‘chirildi");
          }}
        >
          <Trash2 className="size-3.5" aria-hidden /> O‘chirish
        </button>
      </div>
    );
  return (
    <Button
      variant="secondary"
      disabled={state === "saving"}
      onClick={async () => {
        setState("saving");
        setPct(0);
        try {
          await saveFiles(files, (l, t) => setPct(t ? Math.round((l / t) * 100) : 0));
          setState("saved");
          toast.success("Kitob telefonga saqlandi");
        } catch (e) {
          setState("none");
          toast.error((e as Error).message || "Saqlab bo‘lmadi. Telefonda joy yetarlimi?");
        }
      }}
    >
      {state === "saving" ? <Loader2 className="animate-spin" /> : <CloudDownload />}
      {state === "saving" ? `Saqlanmoqda… ${pct}%` : `Offline saqlash (${mb(total)})`}
    </Button>
  );
}
