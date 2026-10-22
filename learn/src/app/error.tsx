"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { tr } from "@/lib/i18n/tr";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
          <AlertTriangle className="size-6" aria-hidden />
        </div>
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">{offline ? tr("Internet aloqasi yo‘q") : tr("Nimadir noto‘g‘ri ketdi")}</h1>
        <p className="mt-2 text-[14.5px] text-muted">{offline ? tr("Aloqa tiklangach qayta urinib ko‘ring.") : tr("Sahifani yuklashda xatolik yuz berdi. Qayta urinib ko‘ring.")}</p>
        {error.digest ? <p className="mt-2 font-mono text-[11.5px] text-muted">{tr("Kod: {0}", error.digest)}</p> : null}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>
            <RefreshCw /> {tr("Qayta urinish")}
          </Button>
          <LinkButton href="/" variant="secondary">
            {tr("Bosh sahifa")}
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
