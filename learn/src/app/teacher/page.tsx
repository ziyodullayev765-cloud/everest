import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ChevronRight, ClipboardCheck, FilePen, Inbox, Plus, Send, UsersRound } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { teacherOverview } from "@/server/services/analytics";
import { can } from "@/server/auth/rbac";
import { formatDateTime, formatLongToday } from "@/lib/dates";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Progress } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { FollowUpCard, RecentQuizzesCard } from "@/components/staff/follow-ups";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Bosh sahifa"); } };

export default async function TeacherHome() {
  const user = await pageUser("teacher");
  const o = await teacherOverview(user);
  return (
    <>
      <PageHeader
        eyebrow={<span className="first-letter:uppercase">{formatLongToday()}</span>}
        title={tr("Xush kelibsiz, {0}", user.displayName.split(" ")[0])}
        actions={
          <>
            <LinkButton href="/teacher/submissions" variant="secondary">
              <Inbox /> {tr("Tekshirish")}
            </LinkButton>
            {can(user, "assignments.create") ? (
              <LinkButton href="/teacher/assignments/new">
                <Plus /> {tr("Yangi vazifa")}
              </LinkButton>
            ) : null}
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={tr("Tekshirish kutilmoqda")} value={o.counts.pending} icon={<ClipboardCheck />} tone="violet" hint={<Link href="/teacher/submissions" className="text-primary hover:underline">{tr("Ko‘rish →")}</Link>} />
        <StatCard label={tr("E’lon qilingan")} value={o.counts.published} icon={<Send />} hint={tr("faol vazifalar")} />
        <StatCard label={tr("Qoralama / reja")} value={o.counts.drafts} icon={<FilePen />} tone="info" />
        <StatCard label={tr("Guruhlar")} value={o.classes.length} icon={<UsersRound />} tone="warning" hint={tr("{0} o‘quvchi", o.classes.reduce((s, c) => s + c.students, 0))} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title={tr("So‘nggi topshirilgan ishlar")} action={<LinkButton href="/teacher/submissions?status=all" variant="ghost" size="sm">{tr("Barchasi")}</LinkButton>} />
            <CardBody className="pt-2">
              {o.recent.length ? (
                <ul className="-mx-2">
                  {o.recent.map((r) => (
                    <li key={r.assignment_id + r.student_id}>
                      <Link href={`/teacher/grade/${r.assignment_id}/${r.student_id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
                        <Avatar name={r.student_name} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold">{r.student_name}</span>
                          <span className="block truncate text-[12px] text-muted">{r.title}</span>
                        </span>
                        <span className="shrink-0 text-[12px] text-muted">{formatDateTime(r.submitted_at)}</span>
                        {r.is_late ? <Badge tone="warning">{tr("kech")}</Badge> : null}
                        <ChevronRight className="size-4 text-muted" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={<Inbox />} title={tr("Hali ish topshirilmagan")} className="py-6" />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tr("Bajarilish darajasi")} description={tr("So‘nggi e’lon qilingan vazifalar")} />
            <CardBody className="space-y-4 pt-3">
              {o.completion.length ? (
                o.completion.map((c) => (
                  <div key={c.id}>
                    <div className="mb-1 flex justify-between gap-3 text-[13.5px]">
                      <Link href={`/teacher/submissions?assignment=${c.id}&status=all`} className="truncate font-semibold hover:text-primary">{c.title}</Link>
                      <span className="shrink-0 text-muted tabular">{c.done} / {c.total}</span>
                    </div>
                    <Progress value={c.total ? (c.done / c.total) * 100 : 0} label={c.title} />
                  </div>
                ))
              ) : (
                <p className="text-[13.5px] text-muted">{tr("E’lon qilingan vazifa yo‘q.")}</p>
              )}
            </CardBody>
          </Card>
        </div>
        <aside className="space-y-6">
          <FollowUpCard user={user} base="/teacher" />
          <RecentQuizzesCard user={user} base="/teacher" />
          <Card>
            <CardHeader title={tr("Yaqin muddatlar")} icon={<CalendarClock />} />
            <CardBody className="pt-2">
              {o.upcoming.length ? (
                <ul className="-mx-2">
                  {o.upcoming.map((a) => (
                    <li key={a.id}>
                      <Link href={`/teacher/assignments/${a.id}`} className="block rounded-xl px-2 py-2 hover:bg-surface-2">
                        <span className="block truncate text-[13.5px] font-semibold">{a.title}</span>
                        <span className="text-[12px] text-muted">{formatDateTime(a.due_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-[13.5px] text-muted">{tr("Yaqin muddat yo‘q.")}</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tr("Guruhlarim")} icon={<UsersRound />} />
            <CardBody className="pt-2">
              <ul className="-mx-2">
                {o.classes.map((c) => (
                  <li key={c.id}>
                    <Link href={`/teacher/classes/${c.id}`} className="flex items-center justify-between rounded-xl px-2 py-2.5 hover:bg-surface-2">
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-[12.5px] text-muted">{tr("{0} o‘quvchi", c.students)}</span>
                    </Link>
                  </li>
                ))}
                {!o.classes.length ? <li className="px-2 py-3 text-[13.5px] text-muted">{tr("Administrator sizga hali guruh biriktirmagan.")}</li> : null}
              </ul>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
