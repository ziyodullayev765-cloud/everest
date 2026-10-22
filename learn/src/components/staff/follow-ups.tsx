import Link from "next/link";
import { Sparkles, UserRoundSearch } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { followUps, recentQuizzes } from "@/server/services/analytics";
import { formatDateTime } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { tr } from "@/lib/i18n/tr";

export async function FollowUpCard({ user, base }: { user: SessionUser; base: string }) {
  const rows = await followUps(user);
  return (
    <Card>
      <CardHeader title={tr("E’tibor kerak")} icon={<UserRoundSearch />} description={tr("Faollik va muddatlar asosida")} />
      <CardBody className="pt-2">
        {rows.length ? (
          <ul className="-mx-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`${base}/students/${r.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                  <Avatar name={r.name} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{r.name}</span>
                    <span className="block truncate text-[12px] text-warning">{r.reasons.join(" · ")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-3 text-[13.5px] text-muted">{tr("Hamma o‘quvchilar faol.")}</p>
        )}
      </CardBody>
    </Card>
  );
}

export async function RecentQuizzesCard({ user, base }: { user: SessionUser; base: string }) {
  const rows = await recentQuizzes(user);
  return (
    <Card>
      <CardHeader title={tr("So‘nggi quizlar")} icon={<Sparkles />} />
      <CardBody className="pt-2">
        {rows.length ? (
          <ul className="-mx-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`${base}/grade/${r.assignment_id}/${r.student_id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{r.name}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {r.title} · {formatDateTime(r.submittedAt)}
                    </span>
                  </span>
                  {r.percent != null ? <span className="text-[13px] font-bold tabular">{r.percent}%</span> : <Badge tone="violet">{tr("tekshiruvda")}</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-3 text-[13.5px] text-muted">{tr("Hali quiz yakunlanmagan.")}</p>
        )}
      </CardBody>
    </Card>
  );
}
