import Link from "next/link";
import { Users } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { listClasses } from "@/server/services/classes";
import { marksSheet, marksSummary, todayLocal } from "@/server/services/marks";
import { MARK_AREAS, MARK_AREA_KEYS, MARK_STYLE, type MarkArea } from "@/lib/marks";
import { addDays } from "@/lib/gamification";
import { cn, fmtNumber } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar } from "./filter-bar";
import { MarksBoard, MarksDay } from "./marks-board";
import { tr } from "@/lib/i18n/tr";

export async function MarksPage({ user, base, sp }: { user: SessionUser; base: string; sp: { class?: string; area?: string; day?: string } }) {
  const classes = await listClasses(user);
  const classId = sp.class && classes.some((c) => c.id === sp.class) ? sp.class : classes[0]?.id;
  const area = (MARK_AREA_KEYS as string[]).includes(sp.area ?? "") ? (sp.area as MarkArea) : MARK_AREAS[0].key;
  const today = todayLocal();
  const day = sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) && sp.day <= today ? sp.day : today;
  const href = (a: string) => `${base}/marks?${new URLSearchParams({ ...(classId ? { class: classId } : {}), area: a, ...(day !== today ? { day } : {}) })}`;

  if (!classId)
    return (
      <>
        <PageHeader title={tr("Dars baholari")} />
        <Card><EmptyState icon={<Users />} title={tr("Guruh yo‘q")} description={tr("Sizga hali guruh biriktirilmagan.")} /></Card>
      </>
    );

  const from = addDays(today, -29);
  const [sheet, summary] = await Promise.all([marksSheet(user, classId, day), marksSummary(user, classId, from, today)]);
  const avg = new Map(summary.map((s) => [`${s.studentId}:${s.area}`, s]));

  return (
    <>
      <PageHeader title={tr("Dars baholari")} description={tr("Har bir o‘quvchiga yo‘nalish bo‘yicha baho qo‘ying: 3 — bajarmagan, 4 — yaxshi, 5 — a’lo.")} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        {classes.length > 1 ? (
          <div className="sm:w-64 [&>div]:mb-0 [&>div]:grid-cols-1">
            <FilterBar fields={[{ name: "class", label: tr("Guruh"), options: classes.map((c) => [c.id, c.name] as [string, string]) }]} />
          </div>
        ) : (
          <div className="text-[15px] font-bold">{classes[0].name}</div>
        )}
        <MarksDay day={day} today={today} />
      </div>
      <nav aria-label={tr("Yo‘nalishlar")} className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {MARK_AREAS.map((a) => (
          <Link
            key={a.key}
            href={href(a.key)}
            replace
            scroll={false}
            aria-current={a.key === area ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border-2 px-4 py-1.5 text-[13.5px] font-extrabold transition",
              a.key === area ? "border-primary bg-primary text-primary-fg shadow-[0_3px_0_0_var(--primary-shadow)]" : "border-border bg-surface text-text-2 hover:bg-surface-2",
            )}
          >
            {a.label}
          </Link>
        ))}
      </nav>
      {sheet.students.length === 0 ? (
        <Card><EmptyState icon={<Users />} title={tr("Guruhda o‘quvchi yo‘q")} description={tr("Avval guruhga o‘quvchi qo‘shing.")} /></Card>
      ) : (
        <div className="space-y-6">
          <MarksBoard key={`${classId}:${area}:${day}`} classId={classId} day={sheet.day} area={area} rows={sheet.students} />
          <Card className="overflow-hidden">
            <CardHeader title={tr("Oxirgi 30 kun: o‘rtacha baholar")} description={tr("Har bir yo‘nalish bo‘yicha o‘rtacha baho va baholar soni")} />
            <CardBody className="pt-2">
              <div className="-mx-5 overflow-x-auto px-5" data-no-pull>
                <table className="w-full text-[13px]">
                  <thead className="text-[12px] text-muted">
                    <tr>
                      <th className="sticky left-0 z-10 min-w-40 bg-surface py-2 pr-3 text-left font-semibold">{tr("O‘quvchi")}</th>
                      {MARK_AREAS.map((a) => <th key={a.key} className="min-w-20 px-2 py-2 text-center font-semibold">{a.label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sheet.students.map((s) => (
                      <tr key={s.id}>
                        <td className="sticky left-0 z-10 bg-surface py-2 pr-3 font-semibold"><Link href={`${base}/students/${s.id}`} className="hover:text-primary">{s.name}</Link></td>
                        {MARK_AREAS.map((a) => {
                          const c = avg.get(`${s.id}:${a.key}`);
                          return (
                            <td key={a.key} className="px-2 py-2 text-center tabular">
                              {c ? (
                                <span className={cn("inline-flex min-w-11 flex-col rounded-lg border px-1.5 py-0.5 font-bold", MARK_STYLE[Math.round(c.avg)])}>
                                  {fmtNumber(c.avg, 1)}
                                  <span className="text-[10px] font-semibold opacity-80">×{c.n}</span>
                                </span>
                              ) : <span className="text-muted">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
