import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { LogoMark } from "@/components/app/logo";
import { RetryButton } from "./retry";

export const metadata: Metadata = { title: "Oflayn" };
export const dynamic = "force-static";

/** Pre-cached by the service worker and shown when a page can't be loaded without a connection. */
export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 pt-safe pb-safe text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-6 w-fit">
          <LogoMark size={52} />
        </div>
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-warning-soft text-warning">
          <WifiOff className="size-6" aria-hidden />
        </div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Internet aloqasi yo‘q</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">Bu sahifani ochish uchun internet kerak. Vazifalar, baholar va quizlar xavfsizlik uchun qurilmada saqlanmaydi.</p>
        <RetryButton />
      </div>
    </main>
  );
}
