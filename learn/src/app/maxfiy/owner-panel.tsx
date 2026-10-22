"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2 } from "lucide-react";
import { ownerAddXpAction, ownerRemoveBonusAction, ownerSetAchievementAction } from "@/app/actions/owner";
import { ACH_CATEGORIES } from "@/lib/achievements";
import { formatDateTime } from "@/lib/dates";
import { cn, fmtNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { Medal } from "@/components/student/medal";
import { tr } from "@/lib/i18n/tr";

type Def = { code: string; title: string; icon: string; category: string; xpReward: number; earned: boolean };
type Bonus = { id: string; amount: number; reason: string; at: string };

export function OwnerPanel({ xp, defs, bonuses }: { xp: number; defs: Def[]; bonuses: Bonus[] }) {
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState("100");
  const [note, setNote] = useState("");
  const router = useRouter();
  const act = (p: Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await p;
      if (r.ok) {
        toast.success(msg);
        router.refresh();
      } else toast.error(r.error ?? tr("Xatolik"));
    });

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border-2 border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-black">{tr("XP")}</h2>
          <span className="inline-flex items-center gap-1.5 text-[20px] font-black tabular">
            <Star className="size-5 fill-[#f5b50b] text-[#f5b50b]" aria-hidden /> {fmtNumber(xp, 0)}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[50, 100, 500, 1000].map((n) => (
            <Button key={n} variant="secondary" size="sm" disabled={pending} onClick={() => act(ownerAddXpAction({ amount: n, note: "" }), tr("+{0} XP", n))}>
              +{n}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28" aria-label={tr("XP miqdori")} />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("Izoh (ixtiyoriy)")} maxLength={80} aria-label={tr("Izoh")} />
          <Button disabled={pending || !Number(amount)} onClick={() => act(ownerAddXpAction({ amount: Number(amount), note }), "Saqlandi")}>
            {tr("Qo‘shish")}
          </Button>
        </div>
        {bonuses.length ? (
          <ul className="mt-4 divide-y divide-border text-[13px]">
            {bonuses.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                <span className={cn("font-black tabular", b.amount > 0 ? "text-primary" : "text-danger")}>{b.amount > 0 ? `+${b.amount}` : b.amount} {tr("XP")}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{b.reason.replace(/^owner:?\s*/, "") || "—"} · {formatDateTime(b.at)}</span>
                <button className="text-muted hover:text-danger" aria-label={tr("O‘chirish")} disabled={pending} onClick={() => act(ownerRemoveBonusAction(b.id), tr("O‘chirildi"))}>
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {ACH_CATEGORIES.map((c) => {
        const list = defs.filter((d) => d.category === c.key);
        if (!list.length) return null;
        return (
          <section key={c.key} className="rounded-3xl border-2 border-border bg-surface p-4">
            <h2 className="mb-3 text-[16px] font-black" style={{ color: c.dark }}>{c.label}</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {list.map((d) => (
                <button
                  key={d.code}
                  type="button"
                  disabled={pending}
                  onClick={() => act(ownerSetAchievementAction(d.code, !d.earned), d.earned ? tr("{0} olib tashlandi", d.title) : tr("{0} qo‘shildi!", d.title))}
                  className={cn("flex flex-col items-center rounded-2xl border-2 px-1 py-3 text-center transition", d.earned ? "border-primary/40 bg-primary-soft" : "border-dashed border-border hover:bg-surface-2")}
                  aria-pressed={d.earned}
                >
                  <Medal icon={d.icon} category={d.category} size={44} locked={!d.earned} />
                  <span className="mt-1.5 line-clamp-2 text-[11.5px] leading-tight font-extrabold">{d.title}</span>
                  <span className="text-[10.5px] font-bold text-muted">{d.earned ? tr("✓ olingan") : tr("+{0} XP", d.xpReward)}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
