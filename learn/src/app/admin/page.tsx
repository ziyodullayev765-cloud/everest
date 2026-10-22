import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ClipboardCheck, GraduationCap, Layers, Send, Users } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { adminOverview } from "@/server/services/analytics";
import { formatDateTime } from "@/lib/dates";
import { fmtPercent } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Progress, Ring } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { ActivityChart } from "@/components/admin/charts";
import { auditLabel } from "@/components/admin/audit-labels";
import { FollowUpCard, RecentQuizzesCard } from "@/components/staff/follow-ups";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Umumiy ko‘rinish"); } };

export default async function AdminHome() {
  const user = await pageUser("admin", "super_admin");
  const o = await adminOverview();
  const c = o.counts;
  return (
    <>
      <PageHeader title={tr("Umumiy ko‘rinish")} description={tr("Platforma holati bir qarashda.")} actions={<LinkButton href="/admin/assignments/new">{tr("Yangi vazifa")}</LinkButton>} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label={tr("O‘quvchilar")} value={c.students} icon={<GraduationCap />} hint={<Link className="text-primary hover:underline" href="/admin/students">{tr("Boshqarish →")}</Link>} />
        <StatCard label={tr("O‘qituvchilar")} value={c.teachers} icon={<Users />} tone="info" hint={<Link className="text-primary hover:underline" href="/admin/teachers">{tr("Boshqarish →")}</Link>} />
        <StatCard label={tr("Faol guruhlar")} value={c.classes} icon={<Layers />} tone="warning" />
        <StatCard label={tr("E’lon qilingan vazifalar")} value={c.published} icon={<Send />} tone="success" />
        <StatCard label={tr("Tekshirish kutilmoqda")} value={c.pending} icon={<ClipboardCheck />} tone="violet" hint={<Link className="text-primary hover:underline" href="/admin/submissions">{tr("Ko‘rish →")}</Link>} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title={tr("Faollik")} description={tr("So‘nggi 14 kun: topshirilgan ishlar va quizlar")} />
            <CardBody>
              <ActivityChart data={o.perDay} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tr("So‘nggi harakatlar")} icon={<Activity />} action={<LinkButton href="/admin/audit" variant="ghost" size="sm">{tr("Audit jurnali")}</LinkButton>} />
            <CardBody className="pt-2">
              {o.recent.length ? (
                <ul className="divide-y divide-border">
                  {o.recent.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                      <span className="min-w-0">
                        <b className="font-semibold">{r.actor ?? tr("Tizim")}</b> <span className="text-text-2">{auditLabel(r.action)}</span>
                      </span>
                      <span className="shrink-0 text-[12px] text-muted">{formatDateTime(r.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-[13.5px] text-muted">{tr("Hali harakat yo‘q.")}</p>
              )}
            </CardBody>
          </Card>
        </div>
        <aside className="space-y-6">
          <FollowUpCard user={user} base="/admin" />
          <RecentQuizzesCard user={user} base="/admin" />
          <Card>
            <CardHeader title={tr("Umumiy bajarilish")} description={tr("E’lon qilingan vazifalar bo‘yicha")} />
            <CardBody className="flex items-center gap-5">
              <Ring value={o.completion.rate ?? 0} size={96} stroke={9}>
                <span className="text-[18px] font-bold tabular">{fmtPercent(o.completion.rate)}</span>
              </Ring>
              <div className="text-[13.5px] text-muted">
                <b className="text-text tabular">{o.completion.done}</b> / <span className="tabular">{o.completion.total}</span> {tr("topshiriq bajarilgan")}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={tr("Hisoblar")} />
            <CardBody className="space-y-3 pt-3 text-[13.5px]">
              <div className="flex justify-between"><span className="text-muted">{tr("Faol emas")}</span><b className="tabular">{c.inactive}</b></div>
              <Progress value={c.students + c.teachers ? ((c.students + c.teachers) / (c.students + c.teachers + c.inactive)) * 100 : 0} label={tr("Faol hisoblar ulushi")} />
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
