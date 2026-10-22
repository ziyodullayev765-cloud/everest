import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Sprout, Star } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { studentAchievements } from "@/server/services/achievements";
import { getSettings } from "@/server/services/settings";
import { categoryOf, METRICS } from "@/lib/achievements";
import { formatDate } from "@/lib/dates";
import { fmtNumber } from "@/lib/utils";
import { Medal } from "@/components/student/medal";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Yutuq"); } };

export default async function AchievementPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await pageUser("student");
  const { code } = await params;
  const [{ list }, settings] = await Promise.all([studentAchievements(user.id), getSettings()]);
  const a = list.find((x) => x.code === code);
  if (!a || !settings.gamification.enabled) notFound();
  const c = categoryOf(a.category);
  const done = !!a.earnedAt;
  const m = METRICS[a.metric];

  return (
    <div className="-mx-4 -mt-5 sm:mx-auto sm:mt-0 sm:max-w-xl">
      <section className="relative overflow-hidden px-5 pt-5 pb-14 text-center text-white sm:rounded-[28px]" style={{ background: done ? `linear-gradient(180deg, #0d5c3a, #0f6e45)` : "linear-gradient(180deg, #4b5550, #5d6862)" }}>
        <span aria-hidden className="pointer-events-none absolute top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-white/10 blur-2xl" />
        <Link href="/achievements" aria-label={tr("Yutuqlarga qaytish")} className="absolute top-4 left-4 grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="relative mx-auto mt-6 w-fit animate-pop">
          <Medal icon={a.icon} category={a.category} size={128} locked={!done} />
        </div>
        <h1 className="relative mt-4 text-[26px] leading-tight font-black">{a.title}</h1>
        <p className="relative text-[14px] font-semibold text-white/80">{c.label}</p>
        <p className="relative mx-auto mt-3 max-w-sm text-[15px] font-semibold">{a.description}</p>
      </section>

      <div className="relative -mt-8 space-y-4 px-4 pb-4 sm:px-0">
        <section className="rounded-3xl border-2 border-border bg-surface p-4 shadow-pop">
          <ul className="space-y-2.5">
            <li className="flex items-start gap-3 text-[14px] font-semibold">
              {done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />}
              <span>
                {m.label}: <b>{fmtNumber(a.threshold)} {m.unit}</b>
              </span>
            </li>
          </ul>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={a.progress.target} aria-valuenow={a.progress.value} aria-label={tr("Yutuq sharti")}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${a.progress.ratio * 100}%` }} />
            </div>
            <span className="shrink-0 text-[13px] font-extrabold tabular">
              {fmtNumber(a.progress.value)} / {fmtNumber(a.progress.target)}
            </span>
          </div>
        </section>

        <section className="rounded-3xl border-2 border-border bg-surface p-4">
          <div className="text-[13px] font-bold text-muted">{tr("Mukofot")}</div>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#fdf1dc]">
              <Star className="size-5 fill-[#f5b50b] text-[#f5b50b]" aria-hidden />
            </span>
            <span className="flex-1 text-[20px] font-black tabular">{a.xpReward > 0 ? `${fmtNumber(a.xpReward)} XP` : tr("Nishon")}</span>
            <span className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${done ? "bg-primary-soft text-primary" : "bg-surface-2 text-muted"}`}>{done ? tr("Olingan") : tr("Olinmagan")}</span>
          </div>
          {done ? (
            <div className="mt-4 border-t border-border pt-3">
              <div className="text-[12.5px] font-bold text-muted">{tr("Olingan sana")}</div>
              <div className="text-[14.5px] font-bold">{formatDate(a.earnedAt!)}</div>
            </div>
          ) : null}
        </section>

        <section className="flex items-center gap-3 rounded-3xl border-2 border-primary/30 bg-primary-soft p-4 text-[14px]">
          <Sprout className="size-7 shrink-0 text-primary" aria-hidden />
          <p>
            {done ? (
              <>
                <b className="text-primary">{tr("Ajoyib!")}</b> {tr("Siz o‘zingiz ustida ishlashda davom etyapsiz!")}
              </>
            ) : (
              <>
                <b className="text-primary">{tr("Oz qoldi!")}</b> {tr("Yana {0} {1} — va bu yutuq sizniki.", fmtNumber(Math.max(0, a.progress.target - a.progress.value)), m.unit)}
              </>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
