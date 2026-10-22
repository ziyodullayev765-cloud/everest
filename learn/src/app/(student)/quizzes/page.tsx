import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { History, ChevronRight } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { listForStudent } from "@/server/services/assignments";
import { db, schema } from "@/server/db";
import { isQuizType } from "@/lib/assignment-kinds";
import { percentOf } from "@/lib/grading";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssignmentBoard } from "@/components/student/assignment-board";

export const metadata: Metadata = { title: "Quizlar" };

export default async function QuizzesPage() {
  const user = await pageUser("student");
  const rows = (await listForStudent(user.id)).filter((r) => isQuizType(r.type));
  const history = await db
    .select({ a: schema.quizAttempts, title: schema.assignments.title, passing: schema.assignments.passingPercent })
    .from(schema.quizAttempts)
    .innerJoin(schema.assignments, eq(schema.assignments.id, schema.quizAttempts.assignmentId))
    .where(eq(schema.quizAttempts.studentId, user.id))
    .orderBy(desc(schema.quizAttempts.startedAt))
    .limit(12);
  return (
    <>
      <PageHeader title="Quizlar" description="Testlar, vaqtli quizlar va mashqlar. Natijalar topshirishingiz bilan hisoblanadi." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <AssignmentBoard rows={rows} emptyTitle="Hozircha quiz yo‘q" emptyText="Yangi quiz e’lon qilinganda bildirishnoma olasiz." />
        <Card className="self-start">
          <CardHeader title="Urinishlar tarixi" icon={<History />} />
          <CardBody className="pt-2">
            {history.length ? (
              <ul className="-mx-2">
                {history.map(({ a, title, passing }) => {
                  const pct = a.score == null ? null : percentOf(Number(a.score), Number(a.maxScore));
                  const href = a.status === "in_progress" ? `/quizzes/${a.assignmentId}/attempt/${a.id}` : `/quizzes/${a.assignmentId}/results/${a.id}`;
                  return (
                    <li key={a.id}>
                      <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold">{title}</span>
                          <span className="block text-[12px] text-muted">
                            {a.attemptNo}-urinish · {formatDateTime(a.submittedAt ?? a.startedAt)}
                          </span>
                        </span>
                        {a.status === "in_progress" ? (
                          <Badge tone="warning">Jarayonda</Badge>
                        ) : pct == null ? (
                          <Badge tone="violet">Tekshirilmoqda</Badge>
                        ) : (
                          <Badge tone={pct >= passing ? "success" : "neutral"} className="tabular">
                            {Math.round(pct)}%
                          </Badge>
                        )}
                        <ChevronRight className="size-4 text-muted" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-6 text-center text-[13.5px] text-muted">Hali birorta quiz ishlanmagan.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
