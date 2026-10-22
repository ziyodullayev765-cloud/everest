import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Lock, Trophy, Zap } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { gamificationSummary } from "@/server/services/gamification";
import { studentAchievements } from "@/server/services/achievements";
import { getSettings } from "@/server/services/settings";
import { ACH_CATEGORIES } from "@/lib/achievements";
import { XP_RULE_LABELS, type XpRules } from "@/lib/gamification";
import { formatShortDate } from "@/lib/dates";
import { cn, fmtNumber } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Medal } from "@/components/student/medal";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Yutuqlar"); } };

const STEPS = [
  "Vazifa, quiz yoki mashqni bajarasiz.",
  "Tizim faolligingizni haqiqiy natijalar asosida qayd etadi.",
  "Shart bajarilganda yutuq ochiladi — bir marta.",
  "Siz XP va maxsus nishon olasiz.",
  "Yutuqlar profilingizda saqlanadi.",
];

export default async function AchievementsPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const user = await pageUser("student");
  const { c } = await searchParams;
  const [g, settings, { list }] = await Promise.all([gamificationSummary(user.id), getSettings(), studentAchievements(user.id)]);
  if (!settings.gamification.enabled || !user.gamificationEnabled)
    return (
      <>
        <PageHeader title={tr("Yutuqlar")} />
        <Alert tone="info">{settings.gamification.enabled ? tr("Siz o‘yin elementlarini sozlamalarda o‘chirgansiz.") : tr("Kurs o‘yin elementlarini (XP, nishonlar) o‘chirib qo‘ygan.")}</Alert>
      </>
    );
  const cat = ACH_CATEGORIES.find((x) => x.key === c)?.key ?? null;
  const shown = cat ? list.filter((a) => a.category === cat) : list;
  const earned = shown.filter((a) => a.earnedAt).sort((a, b) => b.earnedAt!.getTime() - a.earnedAt!.getTime());
  const locked = shown.filter((a) => !a.earnedAt).sort((a, b) => b.progress.ratio - a.progress.ratio || a.sortOrder - b.sortOrder);
  const totalEarned = list.filter((a) => a.earnedAt).length;
  const rules = settings.gamification.rules;

  const tabs = [{ key: null, label: tr("Barchasi") }, ...ACH_CATEGORIES.map((x) => ({ key: x.key as string | null, label: x.label }))];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={tr("Yutuqlar")} description={tr("XP va nishonlar — motivatsiya uchun. Rasmiy baholarga qo‘shilmaydi.")} />

      <nav aria-label={tr("Turkumlar")} className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.key ? `/achievements?c=${t.key}` : "/achievements"}
            aria-current={cat === t.key ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border-2 px-4 py-1.5 text-[13.5px] font-extrabold transition",
              cat === t.key ? "border-primary bg-primary text-primary-fg shadow-[0_3px_0_0_var(--primary-shadow)]" : "border-border bg-surface text-text-2 hover:bg-surface-2",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-5">
        <section className="flex items-center gap-4 rounded-3xl border-2 border-border bg-surface p-4 sm:p-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#fdf1dc]">
            <Trophy className="size-9 text-[#e0900a]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-muted">{tr("Umumiy yutuqlar")}</div>
            <div className="text-[28px] leading-tight font-black tabular">
              {totalEarned} <span className="text-[18px] text-muted">/ {list.length}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-[#f5b50b]" style={{ width: `${list.length ? (totalEarned / list.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <div className="text-[13px] font-bold text-muted">{tr("{0}-daraja", g.level.level)}</div>
            <div className="text-[20px] font-black tabular">{tr("{0} XP", fmtNumber(g.xp))}</div>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Flame className="size-5 text-[#ff7a1a]" />, value: tr("{0} kun", g.streak.current), label: tr("Joriy streak") },
            { icon: <Flame className="size-5 text-[#e5484d]" />, value: tr("{0} kun", g.streak.best), label: tr("Eng uzun") },
            { icon: <Zap className="size-5 text-[#f5b50b]" />, value: `${fmtNumber(g.xp)}`, label: "XP" },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl border-2 border-border bg-surface px-3 py-3 text-center">
              <div className="flex justify-center" aria-hidden>{s.icon}</div>
              <div className="mt-1 text-[17px] font-black tabular">{s.value}</div>
              <div className="text-[11.5px] font-semibold text-muted">{s.label}</div>
            </div>
          ))}
        </div>

        <section>
          <h2 className="mb-3 text-[17px] font-black">{tr("Olingan yutuqlar")} <span className="text-muted">({earned.length})</span></h2>
          {earned.length ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {earned.map((a) => (
                <Link key={a.code} href={`/achievements/${a.code}`} className="flex flex-col items-center rounded-3xl border-2 border-border bg-surface px-2 py-4 text-center transition hover:-translate-y-0.5 hover:border-border-strong">
                  <Medal icon={a.icon} category={a.category} size={64} />
                  <div className="mt-2 line-clamp-2 text-[13px] leading-tight font-extrabold">{a.title}</div>
                  <div className="mt-1 text-[11.5px] font-semibold text-muted">{formatShortDate(a.earnedAt!)}</div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-3xl border-2 border-dashed border-border bg-surface px-4 py-6 text-center text-[13.5px] text-muted">
              {tr("Hali yutuq yo‘q. Birinchi darsni yakunlang — “Birinchi qadam” ochiladi!")}
            </p>
          )}
        </section>

        {locked.length ? (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-[17px] font-black">
              <Lock className="size-4 text-muted" aria-hidden /> {tr("Hali ochilmaganlar")} <span className="text-muted">({locked.length})</span>
            </h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {locked.map((a) => (
                <Link key={a.code} href={`/achievements/${a.code}`} className="flex flex-col items-center rounded-3xl border-2 border-dashed border-border bg-surface/60 px-2 py-4 text-center hover:bg-surface">
                  <Medal icon={a.icon} category={a.category} size={56} locked />
                  <div className="mt-2 line-clamp-2 text-[12.5px] leading-tight font-extrabold text-text-2">{a.title}</div>
                  <div className="mt-2 h-1.5 w-full max-w-[90px] overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${a.progress.ratio * 100}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-muted tabular">
                    {fmtNumber(a.progress.value)}/{fmtNumber(a.progress.target)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <Card>
          <CardHeader title={tr("Yutuqlar qanday ishlaydi?")} />
          <CardBody className="pt-3">
            <ol className="space-y-2.5">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-[13.5px]">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[12.5px] font-black text-primary-fg">{i + 1}</span>
                  {tr(s)}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12.5px] text-muted">{tr("Bitta ishni qayta topshirib yutuqni qayta olib bo‘lmaydi: har bir vazifa, quiz va so‘z bir marta hisoblanadi.")}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={tr("XP qanday beriladi")} description={tr("Takroriy urinishlar XP ni ko‘paytirmaydi. Har bir yutuq ochilganda o‘z XP mukofoti ham beriladi.")} />
          <CardBody className="pt-3">
            <ul className="divide-y divide-border text-[13.5px]">
              {(Object.keys(XP_RULE_LABELS) as (keyof XpRules)[]).map((k) => (
                <li key={k} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-text-2">{XP_RULE_LABELS[k]}</span>
                  <span className="shrink-0 font-bold text-primary tabular">{tr("+{0} XP", rules[k])}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <p className="pb-2 text-center text-[13px] font-bold text-primary italic">{tr("Kichik qadamlar — katta maqsadlarga olib boradi!")}</p>
      </div>
    </div>
  );
}
