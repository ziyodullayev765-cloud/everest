import type { Metadata } from "next";
import Link from "next/link";
import { resetTokenValid } from "@/server/services/users";
import { EmptyState } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { KeyRound } from "lucide-react";
import { ResetForm } from "./reset-form";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Parolni tiklash"); } };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await resetTokenValid(token);
  if (!valid)
    return (
      <EmptyState
        icon={<KeyRound />}
        title={tr("Havola yaroqsiz")}
        description={tr("Bu havola eskirgan yoki allaqachon ishlatilgan. Administratordan yangi havola so‘rang.")}
        action={<LinkButton href="/login">{tr("Kirish sahifasi")}</LinkButton>}
      />
    );
  return (
    <div className="animate-fade-up">
      <h1 className="text-[24px] font-bold tracking-[-0.02em] text-text">{tr("Yangi parol")}</h1>
      <p className="mt-1.5 text-[14.5px] text-muted">{tr("{0}, hisobingiz uchun yangi parol o‘rnating.", valid.name)}</p>
      <ResetForm token={token} />
      <p className="mt-6 text-center text-[13px]">
        <Link href="/login" className="text-muted hover:text-text">
          {tr("Kirish sahifasiga qaytish")}
        </Link>
      </p>
    </div>
  );
}
