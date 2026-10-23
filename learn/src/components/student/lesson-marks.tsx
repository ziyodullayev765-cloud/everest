import { MARK_AREAS, MARK_STYLE, MARKS, markAreaOf } from "@/lib/marks";
import { formatShortDate } from "@/lib/dates";
import { cn, fmtNumber } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { tr } from "@/lib/i18n/tr";

type M = { area: string; day: string; mark: number };

/** Student view of lesson marks: average per skill and the latest marks. */
export function LessonMarks({ marks }: { marks: M[] }) {
  const byArea = MARK_AREAS.map((a) => ({ area: a, list: marks.filter((m) => m.area === a.key) })).filter((x) => x.list.length);
  const all = marks.length ? marks.reduce((s, m) => s + m.mark, 0) / marks.length : 0;
  return (
    <Card>
      <CardHeader
        title={tr("Dars baholari")}
        description={tr("O‘qituvchi qo‘ygan baholar · o‘rtacha {0}", fmtNumber(all, 1))}
      />
      <CardBody className="space-y-4 pt-3">
        <div className="flex flex-wrap gap-2 text-[12px]">
          {MARKS.map((m) => (
            <span key={m.value} className={cn("rounded-lg border px-2 py-0.5 font-bold", MARK_STYLE[m.value])}>{m.value} — {m.label}</span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {byArea.map(({ area, list }) => {
            const avg = list.reduce((s, m) => s + m.mark, 0) / list.length;
            return (
              <div key={area.key} className="rounded-2xl border-2 border-border p-3">
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-text-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: area.color }} />
                  <span className="truncate">{area.label}</span>
                </div>
                <div className="mt-1 text-[24px] leading-tight font-black tabular">{fmtNumber(avg, 1)}</div>
                <div className="text-[11.5px] text-muted">{tr("{0} ta baho", list.length)}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {list.slice(0, 6).map((m) => (
                    <span key={m.day} title={formatShortDate(new Date(m.day + "T12:00:00+05:00"))} className={cn("grid size-6 place-items-center rounded-md border text-[12px] font-black", MARK_STYLE[m.mark])}>{m.mark}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <details className="group">
          <summary className="cursor-pointer text-[13px] font-bold text-primary">{tr("Barcha baholar ro‘yxati")}</summary>
          <ul className="mt-2 divide-y divide-border">
            {marks.map((m) => (
              <li key={`${m.area}:${m.day}`} className="flex items-center gap-3 py-2 text-[13.5px]">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg border font-black", MARK_STYLE[m.mark])}>{m.mark}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{markAreaOf(m.area).label}</span>
                <span className="shrink-0 text-[12.5px] text-muted">{formatShortDate(new Date(m.day + "T12:00:00+05:00"))}</span>
              </li>
            ))}
          </ul>
        </details>
      </CardBody>
    </Card>
  );
}
