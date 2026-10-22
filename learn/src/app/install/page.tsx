import type { Metadata } from "next";
import { Logo } from "@/components/app/logo";
import { InstallGuide } from "./install-guide";
import { LinkButton } from "@/components/ui/button";
import { OfflineStatus } from "@/components/app/offline-status";

export const metadata: Metadata = { title: "Ilovani o‘rnatish" };

export default function InstallPage() {
  return (
    <div className="min-h-dvh pt-safe pb-safe">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <LinkButton href="/" variant="ghost" size="sm">
            Ilovaga qaytish
          </LinkButton>
        </div>
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">Ilovani telefoningizga o‘rnating</h1>
        <p className="mt-2 text-[14.5px] text-muted">Bosh ekrandan bir tegish bilan oching — alohida oynada, xuddi oddiy ilovadek. App Store yoki Play Market kerak emas. O‘rnatilganda ilova fayllari telefonga yuklanadi va tez ochiladi.</p>
        <OfflineStatus />
        <InstallGuide />
      </div>
    </div>
  );
}
