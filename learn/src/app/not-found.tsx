import { Compass } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Compass className="size-6" aria-hidden />
        </div>
        <p className="text-[13px] font-semibold tracking-[0.08em] text-muted">404</p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">Sahifa topilmadi</h1>
        <p className="mt-2 text-[14.5px] text-muted">Bu sahifa mavjud emas yoki uni ko‘rishga ruxsatingiz yo‘q.</p>
        <LinkButton href="/" className="mt-6">
          Bosh sahifaga
        </LinkButton>
      </div>
    </main>
  );
}
