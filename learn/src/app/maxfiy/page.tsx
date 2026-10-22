import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { homeFor } from "@/server/auth/rbac";
import { isOwner, ownerOverview } from "@/server/services/owner";
import { OwnerPanel } from "./owner-panel";

export const metadata: Metadata = { title: "Maxfiy bo‘lim", robots: { index: false } };

export default async function Page() {
  const user = await pageUser();
  if (!isOwner(user)) notFound();
  const o = await ownerOverview(user);
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pt-safe pb-10">
      <div className="flex items-center gap-3 py-5">
        <Link href={homeFor(user.role)} aria-label="Orqaga" className="grid size-10 place-items-center rounded-full border-2 border-border bg-surface hover:bg-surface-2">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div>
          <h1 className="text-[24px] font-black">🤫 Maxfiy bo‘lim</h1>
          <p className="text-[13px] text-muted">Faqat siz ko‘rasiz. Baholarga ta’sir qilmaydi.</p>
        </div>
      </div>
      <OwnerPanel
        xp={o.xp}
        defs={o.defs.map((d) => ({ code: d.code, title: d.title, icon: d.icon, category: d.category, xpReward: d.xpReward, earned: !!d.earnedAt }))}
        bonuses={o.bonuses.map((b) => ({ id: b.id, amount: b.amount, reason: b.reason, at: new Date(b.created_at).toISOString() }))}
      />
    </div>
  );
}
