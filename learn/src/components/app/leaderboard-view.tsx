import Link from "next/link";
import { Crown, Info, Trophy } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { leaderboardView, REVIEW_POINTS_PER_DAY } from "@/server/services/leaderboard";
import { addDays } from "@/lib/gamification";
import { formatDayShort } from "@/lib/dates";
import { tr } from "@/lib/i18n/tr";
import { cn, fmtNumber } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/avatar";

const MEDAL = ["", "🥇", "🥈", "🥉"];
const PODIUM = [
  { place: 2, h: "h-20", bg: "bg-[#e9edf1] dark:bg-[#1d242c]", ring: "ring-[#a9b6c3]" },
  { place: 1, h: "h-28", bg: "bg-[#fbf0cf] dark:bg-[#2d2610]", ring: "ring-[#f5b50b]" },
  { place: 3, h: "h-14", bg: "bg-[#f6ead9] dark:bg-[#2c2012]", ring: "ring-[#d08a45]" },
];

/** Weekly group ranking with a podium; shared by students, teachers and admins. */
export async function LeaderboardView({ user, base, groupId }: { user: SessionUser; base: string; groupId?: string }) {
  const v = await leaderboardView(user, groupId);
  if (!v)
    return (
      <>
        <PageHeader title={tr("Haftalik reyting")} />
        <Alert tone="info">{tr("Kurs o‘yin elementlarini (XP, nishonlar) o‘chirib qo‘ygan.")}</Alert>
      </>
    );
  const isStudent = user.role === "student";
  const range = `${formatDayShort(v.week.start)} – ${formatDayShort(addDays(v.week.start, 6))}`;
  const me = v.rows.find((r) => r.studentId === user.id);
  const top = v.rows.filter((r) => r.place <= 3 && r.score > 0);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={tr("Haftalik reyting")} description={tr("Shu hafta: {0}. Har dushanba 1–3-o‘rin egalari medal oladi.", range)} />

      {v.groups.length > 1 ? (
        <nav aria-label={tr("Guruhlar")} className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {v.groups.map((g) => (
            <Link
              key={g.id}
              href={`${base}?g=${g.id}`}
              aria-current={v.group?.id === g.id ? "page" : undefined}
              className={cn("shrink-0 rounded-full border-2 px-4 py-1.5 text-[13.5px] font-extrabold", v.group?.id === g.id ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-text-2 hover:bg-surface-2")}
            >
              {g.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {!v.group ? (
        <EmptyState icon={<Trophy />} title={tr("Hali guruhga qo‘shilmagansiz")} description={tr("Administrator sizni guruhga biriktirgach, shu yerda ko‘rinadi.")} />
      ) : (
        <div className="space-y-5">
          {isStudent && me ? (
            <section className="flex items-center gap-4 rounded-3xl border-2 border-primary/30 bg-primary-soft p-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-[22px] font-black text-primary-fg">{me.place <= 3 && me.score > 0 ? MEDAL[me.place] : me.place}</span>
              <div className="min-w-0">
                <div className="text-[18px] font-black">{tr("Siz {0}-o‘rindasiz", me.place)}</div>
                <div className="text-[13px] font-semibold text-text-2">
                  {tr("{0} o‘quvchidan · {1} ball", v.rows.length, fmtNumber(me.score, 0))}
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl border-2 border-border bg-surface px-3 pt-5 pb-0">
            {top.length ? (
              <div className="grid grid-cols-3 items-end gap-2">
                {PODIUM.map((p) => {
                  const ws = top.filter((r) => r.place === p.place);
                  return (
                    <div key={p.place} className="flex flex-col items-center text-center">
                      {ws.length ? (
                        ws.slice(0, 2).map((w) => (
                          <div key={w.studentId} className="mb-1 flex flex-col items-center">
                            {p.place === 1 ? <Crown className="mb-0.5 size-5 fill-[#f5b50b] text-[#f5b50b]" aria-hidden /> : null}
                            <Avatar name={w.name} fileId={w.avatarFileId} size={p.place === 1 ? 56 : 46} className={cn("ring-4", p.ring)} />
                            <div className="mt-1 line-clamp-1 max-w-[100px] text-[12.5px] font-extrabold">{w.name}</div>
                            <div className="text-[11.5px] font-bold text-muted tabular">{tr("{0} ball", fmtNumber(w.score, 0))}</div>
                          </div>
                        ))
                      ) : (
                        <div className="mb-1 text-[12px] text-muted">—</div>
                      )}
                      <div className={cn("mt-1 grid w-full place-items-center rounded-t-2xl text-[26px]", p.h, p.bg)} aria-label={tr("{0}-o‘rin", p.place)}>
                        {MEDAL[p.place]}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="pb-5 text-center text-[13.5px] text-muted">{tr("Bu hafta hali hech kim ball to‘plamagan. Birinchi bo‘ling!")}</p>
            )}
          </section>

          <section className="overflow-hidden rounded-3xl border-2 border-border bg-surface">
            <ol className="divide-y divide-border">
              {v.rows.map((r) => (
                <li key={r.studentId} className={cn("flex items-center gap-3 px-4 py-3", r.studentId === user.id && "bg-primary-soft")}>
                  <span className="w-7 shrink-0 text-center text-[15px] font-black tabular">{r.place <= 3 && r.score > 0 ? MEDAL[r.place] : r.place}</span>
                  <Avatar name={r.name} fileId={r.avatarFileId} size={34} />
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold">
                    {r.name}
                    {r.studentId === user.id ? <span className="ml-1 text-[12px] text-primary">({tr("siz")})</span> : null}
                  </span>
                  <span className="shrink-0 text-[14px] font-black tabular">{fmtNumber(r.score, 0)}</span>
                </li>
              ))}
            </ol>
          </section>

          {v.last.length ? (
            <section className="rounded-3xl border-2 border-border bg-surface p-4">
              <h2 className="mb-2 text-[15px] font-extrabold">{tr("O‘tgan hafta g‘oliblari")}</h2>
              <ul className="space-y-1.5 text-[14px]">
                {v.last.map((w) => (
                  <li key={w.studentId} className="flex items-center gap-2">
                    <span aria-hidden>{MEDAL[w.place]}</span>
                    <span className="flex-1 font-bold">{w.name}</span>
                    <span className="text-muted tabular">{tr("{0} ball", fmtNumber(w.score, 0))}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="flex gap-2 px-1 text-[12.5px] text-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {tr("Ball = shu hafta to‘plangan XP + har bir to‘g‘ri takrorlangan so‘z uchun 1 ball (kuniga ko‘pi bilan {0}). Hafta dushanba kuni Toshkent vaqti bilan boshlanadi.", REVIEW_POINTS_PER_DAY)}
          </p>
        </div>
      )}
    </div>
  );
}
