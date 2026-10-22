import { Megaphone, Target, Users } from "lucide-react";
import { classPage } from "@/server/services/classes";
import { formatDate, formatDateTime } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Progress } from "@/components/ui/feedback";
import { RichText } from "@/components/ui/rich-text";
import { tr } from "@/lib/i18n/tr";

export function ClassPageView({ data, staffTools }: { data: Awaited<ReturnType<typeof classPage>>; staffTools?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-5">
        {staffTools}
        <Card>
          <CardHeader title={tr("E’lonlar")} icon={<Megaphone />} />
          <CardBody className="pt-3">
            {data.announcements.length ? (
              <ul className="space-y-3">
                {data.announcements.map((a) => (
                  <li key={a.id} className="rounded-xl bg-surface-2 p-4">
                    <div className="text-[14.5px] font-bold">{a.title}</div>
                    <div className="mb-2 text-[12px] text-muted">
                      {a.author} · {formatDateTime(a.createdAt)}
                    </div>
                    <RichText text={a.body} className="text-[14px] text-text-2" />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<Megaphone />} title={tr("E’lonlar yo‘q")} className="py-6" />
            )}
          </CardBody>
        </Card>
      </div>
      <aside className="space-y-5">
        <Card>
          <CardHeader title={tr("O‘qituvchilar")} icon={<Users />} description={tr("{0} nafar o‘quvchi", data.studentCount)} />
          <CardBody className="pt-3">
            <ul className="space-y-2.5 text-[13.5px]">
              {data.teachers.map((t, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-[12.5px] text-muted">{tr("Ustoz")}</span>
                </li>
              ))}
              {!data.teachers.length ? <li className="text-muted">{tr("Biriktirilmagan")}</li> : null}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={tr("Guruh musobaqalari")} icon={<Target />} description={tr("Umumiy natija — hech kim alohida ko‘rsatilmaydi")} />
          <CardBody className="space-y-4 pt-3">
            {data.challenges.length ? (
              data.challenges.map((c) => (
                <div key={c.id}>
                  <div className="mb-1 flex justify-between gap-2 text-[13.5px]">
                    <span className="font-semibold">{c.title}</span>
                    <span className="shrink-0 text-muted tabular">
                      {c.progress} / {c.target}
                    </span>
                  </div>
                  <Progress value={(c.progress / c.target) * 100} label={c.title} />
                  <div className="mt-1 text-[11.5px] text-muted">{c.endsAt < new Date() ? tr("Yakunlangan") : `${formatDate(c.endsAt)} gacha`}</div>
                </div>
              ))
            ) : (
              <p className="text-[13px] text-muted">{tr("Faol musobaqa yo‘q.")}</p>
            )}
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}
