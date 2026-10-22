import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/session";
import { homeFor } from "@/server/auth/rbac";
import { Alert } from "@/components/ui/feedback";
import { LoginForm } from "./login-form";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Kirish"); } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : homeFor(user.role));
  return (
    <div className="animate-fade-up">
      <h1 className="text-[26px] font-bold tracking-[-0.02em] text-text">{tr("Xush kelibsiz")}</h1>
      <p className="mt-1.5 text-[14.5px] text-muted">{tr("Davom etish uchun hisobingizga kiring.")}</p>
      {sp.reset ? (
        <Alert tone="success" className="mt-6">
          {tr("Parol yangilandi. Yangi parol bilan kiring.")}
        </Alert>
      ) : null}
      <LoginForm next={sp.next ?? ""} />
      <details className="group mt-8 rounded-xl border border-border bg-surface px-4 py-3 text-[13.5px]">
        <summary className="cursor-pointer list-none font-semibold text-text-2 marker:hidden">{tr("Parolni unutdingizmi?")}</summary>
        <p className="mt-2 leading-relaxed text-muted">
          {tr("Xavfsizlik uchun parolni faqat kurs administratori tiklaydi. Ustozingiz yoki administratorga murojaat qiling — ular sizga bir martalik tiklash havolasini beradi.")}
        </p>
      </details>
      <p className="mt-6 text-center text-[13px] text-muted">
        {tr("Ilovani telefoningizga o‘rnatmoqchimisiz?")}{" "}
        <Link href="/install" className="font-semibold text-primary hover:underline">
          {tr("Qo‘llanma")}
        </Link>
      </p>
    </div>
  );
}
