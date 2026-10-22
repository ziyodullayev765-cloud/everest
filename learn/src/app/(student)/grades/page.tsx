import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MessageSquareText, Star } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { studentGrades } from "@/server/services/grades";
import { getSettings } from "@/server/services/settings";
import { isQuizType } from "@/lib/assignment-kinds";
import { formatDate } from "@/lib/dates";
import { round2 } from "@/lib/grading";
import { fmtNumber, fmtPercent } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { AssignmentType } from "@/server/db/schema";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Baholar" };

export default async function GradesPage() {
  const user = await pageUser("student");
  const [grades, settings] = await Promise.all([studentGrades(user.id), getSettings()]);
  const finals = grades.filter((g) => g.status === "final");
  const avg = grades.length ? round2(grades.reduce((s, g) => s + g.percent, 0) / grades.length) : null;
  const bySubject = [...grades.reduce((m, g) => m.set(g.subjectName, [...(m.get(g.subjectName) ?? []), g]), new Map<string, typeof grades>()).entries()];

  return (
    <>
      <PageHeader title="Baholar" description="Barcha baholaringiz, o‘qituvchi izohlari va baholash holati." />
      {grades.length === 0 ? (
        <Card>
          <EmptyState icon={<Star />} title="Hali baho yo‘q" description="Topshirgan ishlaringiz baholangach, ular shu yerda ko‘rinadi." />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="O‘rtacha" value={fmtPercent(avg)} icon={<Star />} hint="barcha baholar bo‘yicha" />
            <StatCard label="Baholar soni" value={grades.length} icon={<Star />} tone="info" hint={`${finals.length} tasi yakuniy`} />
            <StatCard label="Dastlabki" value={grades.length - finals.length} icon={<Star />} tone="warning" hint="hali yakunlanmagan" />
            <StatCard label="Kategoriyalar" value={bySubject.length} icon={<Star />} tone="violet" hint="baholangan yo‘nalishlar" />
          </div>
          <Card>
            <CardHeader title="Baholash shkalasi" description="Foiz natija quyidagi baholarga aylantiriladi" />
            <CardBody className="flex flex-wrap gap-2 pt-3">
              {[...settings.grading.scale].sort((a, b) => b.min - a.min).map((b) => (
                <span key={b.label} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-[13px]">
                  <b className="text-[15px] text-primary">{b.label}</b> {b.name} <span className="text-muted tabular">≥ {b.min}%</span>
                </span>
              ))}
            </CardBody>
          </Card>
          {bySubject.map(([subject, list]) => {
            const sAvg = round2(list.reduce((s, g) => s + g.percent, 0) / list.length);
            return (
              <Card key={subject}>
                <CardHeader
                  title={
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: list[0].subjectColor }} />
                      {subject}
                    </span>
                  }
                  description={`${list.length} ta baho · o‘rtacha ${fmtPercent(sAvg)}`}
                />
                <CardBody className="pt-2">
                  <ul className="-mx-2 divide-y divide-border">
                    {list.map((g) => (
                      <li key={g.id}>
                        <Link
                          href={isQuizType(g.type as AssignmentType) ? (g.attemptId ? `/quizzes/${g.assignmentId}/results/${g.attemptId}` : `/quizzes/${g.assignmentId}`) : `/assignments/${g.assignmentId}`}
                          className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-surface-2"
                        >
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-[16px] font-bold text-primary-soft-fg">{g.label}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium">{g.title}</span>
                            <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                              {t.assignmentType[g.type as AssignmentType]} · {formatDate(g.gradedAt)}
                              {g.feedbackCount ? (
                                <span className="inline-flex items-center gap-1 text-info">
                                  <MessageSquareText className="size-3" aria-hidden /> izoh
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-[14px] font-semibold tabular">
                              {fmtNumber(g.points, 2)} / {fmtNumber(g.maxPoints, 2)}
                            </span>
                            <Badge tone={g.status === "final" ? "success" : "warning"} className="mt-0.5">
                              {t.gradeStatus[g.status]}
                            </Badge>
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
