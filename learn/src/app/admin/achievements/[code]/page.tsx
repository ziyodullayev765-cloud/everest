import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { achievementEarners } from "@/server/services/achievements";
import { METRICS, categoryOf, type MetricKey } from "@/lib/achievements";
import { formatDateTime } from "@/lib/dates";
import { fmtNumber } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Medal } from "@/components/student/medal";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Yutuq"); } };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const user = await pageUser("admin", "super_admin");
  const { code } = await params;
  const { def, rows } = await achievementEarners(user, code);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/achievements" className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden /> {tr("Yutuqlar")}
      </Link>
      <div className="flex items-center gap-4 rounded-3xl border-2 border-border bg-surface p-5">
        <Medal icon={def.icon} category={def.category} size={80} locked={!def.active} />
        <div className="min-w-0">
          <h1 className="text-[22px] font-black">{def.title}</h1>
          <p className="text-[13px] font-semibold text-muted">{categoryOf(def.category).label}{def.active ? "" : tr(" · o‘chirilgan")}</p>
          <p className="mt-1 text-[13.5px]">{def.description}</p>
          <p className="mt-1 text-[12.5px] text-muted">
            {tr("{0} ≥ {1} · +{2} XP", METRICS[def.metric as MetricKey]?.label ?? def.metric, fmtNumber(def.threshold), def.xpReward)}
          </p>
        </div>
      </div>
      <Card>
        <CardHeader title={tr("Olgan o‘quvchilar")} description={`${rows.length} nafar`} />
        <CardBody className="pt-3">
          {rows.length ? (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                  <Link href={`/admin/students/${r.id}`} className="min-w-0 truncate font-bold hover:text-primary">
                    {r.name} <span className="font-normal text-muted">@{r.username}</span>
                  </Link>
                  <span className="shrink-0 text-muted tabular">{formatDateTime(r.earnedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Users />} title={tr("Hali hech kim olmagan")} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
