import Link from "next/link";
import { CalendarClock, ChevronRight, FileText, FileUp, BookOpen, Sparkles, Timer, Dumbbell, ListChecks, ListTodo } from "lucide-react";
import type { StudentAssignmentRow } from "@/server/services/assignments";
import { isQuizType } from "@/lib/assignment-kinds";
import { formatDateTime, remaining } from "@/lib/dates";
import { cn, fmtNumber } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { StatusBadge } from "./status";

const TYPE_ICON = { written: FileText, file_upload: FileUp, multiple_choice: ListChecks, short_answer: ListChecks, true_false: ListChecks, timed_quiz: Timer, practice: Dumbbell, material: BookOpen, homework: ListTodo } as const;

export function hrefFor(a: Pick<StudentAssignmentRow, "id" | "type">) {
  return isQuizType(a.type) ? `/quizzes/${a.id}` : `/assignments/${a.id}`;
}

function actionLabel(a: StudentAssignmentRow) {
  if (a.type === "material") return a.status === "read" ? "Qayta o‘qish" : "O‘qish";
  if (isQuizType(a.type)) {
    if (a.status === "in_progress") return "Davom ettirish";
    if (a.status === "graded" || a.status === "reviewing" || a.status === "submitted") return "Natija";
    return a.status === "overdue" ? "Ko‘rish" : "Boshlash";
  }
  if (a.status === "returned") return "Qayta ishlash";
  if (a.status === "in_progress") return "Davom ettirish";
  if (a.status === "new") return "Bajarish";
  if (a.status === "overdue") return a.allowLate ? "Kechikib topshirish" : "Ko‘rish";
  return "Ko‘rish";
}

export function DueLabel({ dueAt, done }: { dueAt: Date | null; done?: boolean }) {
  if (!dueAt) return <span className="text-muted">{t.common.noDeadline}</span>;
  const r = remaining(dueAt);
  const urgent = !done && !r.overdue && r.hours < 24;
  return (
    <span className={cn("inline-flex items-center gap-1", done ? "text-muted" : r.overdue ? "text-danger" : urgent ? "text-warning" : "text-muted")}>
      <CalendarClock className="size-3.5" aria-hidden />
      <span suppressHydrationWarning>{done ? formatDateTime(dueAt) : r.text}</span>
    </span>
  );
}

export function AssignmentCard({ a, compact }: { a: StudentAssignmentRow; compact?: boolean }) {
  const Icon = TYPE_ICON[a.type] ?? FileText;
  const done = ["submitted", "reviewing", "graded", "read"].includes(a.status);
  return (
    <Link
      href={hrefFor(a)}
      className="group flex animate-fade-up flex-col rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:-translate-y-px hover:border-border-strong hover:shadow-pop sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${a.subjectColor} 13%, transparent)`, color: a.subjectColor }}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-x-1.5 text-[12.5px] text-muted [&>span]:truncate">
            <span className="font-medium" style={{ color: a.subjectColor }}>
              {a.subjectName}
            </span>
            <span aria-hidden>·</span>
            <span>{t.assignmentType[a.type]}</span>
          </div>
          <h3 className="mt-0.5 line-clamp-2 text-[15px] leading-snug font-semibold text-text">{a.title}</h3>
          {!compact ? <p className="mt-0.5 truncate text-[12.5px] text-muted">{a.authorName}</p> : null}
        </div>
        <StatusBadge status={a.status} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-[12.5px]">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <DueLabel dueAt={a.dueAt} done={done} />
          {a.type !== "material" && a.type !== "practice" ? (
            <span className="text-muted tabular">
              {a.gradePoints != null ? (
                <>
                  <b className="font-semibold text-text">{fmtNumber(a.gradePoints, 2)}</b> / {fmtNumber(a.maxScore, 2)} {t.common.points}
                </>
              ) : (
                <>max {fmtNumber(a.maxScore, 2)} {t.common.points}</>
              )}
            </span>
          ) : null}
          {a.timeLimitMinutes ? (
            <span className="inline-flex items-center gap-1 text-muted">
              <Timer className="size-3.5" aria-hidden />
              {a.timeLimitMinutes} daq
            </span>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-primary">
          {actionLabel(a)}
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export { Sparkles as QuizIcon };
