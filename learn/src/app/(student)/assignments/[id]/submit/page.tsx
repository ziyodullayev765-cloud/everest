import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { orNotFound, pageUser } from "@/server/auth/guards";
import { getForStudent } from "@/server/services/assignments";
import { editability } from "@/server/services/submissions";
import { isWorkType, submissionWindow } from "@/lib/assignment-kinds";
import { PageHeader } from "@/components/ui/page";
import { Alert } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import { SubmitEditor } from "./submit-editor";

export const metadata: Metadata = { title: "Topshirish" };

export default async function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser("student");
  const d = await orNotFound(getForStudent(user.id, id));
  const a = d.assignment;
  if (!isWorkType(a.type)) redirect(`/assignments/${id}`);
  const ed = editability(a, d.submission, d.grade);
  const win = submissionWindow(a);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ href: `/assignments/${id}`, label: "Vazifa" }} eyebrow={d.subject?.name} title={a.title} />
      {!ed.canEdit && d.submission && d.submission.version > 0 ? (
        // Also what the student sees right after submitting (the action revalidates this page).
        <Card className="animate-fade-up">
          <CardBody className="flex flex-col items-center px-6 py-10 text-center">
            <div className="mb-4 grid size-16 place-items-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="size-8" aria-hidden />
            </div>
            <h2 className="text-[20px] font-bold tracking-[-0.01em]">Ishingiz topshirildi</h2>
            <p className="mt-1.5 text-[14px] text-muted">
              {formatDateTime(d.submission.submittedAt!)} da qabul qilindi{d.submission.version > 1 ? ` (${d.submission.version}-topshiriq)` : ""}.{d.submission.isLate ? " Muddatdan kechikib topshirildi." : ""}
            </p>
            <p className="mt-1 text-[13px] text-muted">O‘qituvchi tekshirgach, baho va izohlar vazifa sahifasida ko‘rinadi.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <LinkButton href={`/assignments/${id}`} variant="secondary">Vazifani ko‘rish</LinkButton>
              <LinkButton href="/">Bosh sahifa</LinkButton>
            </div>
          </CardBody>
        </Card>
      ) : !ed.canEdit ? (
        <Alert tone="info" title="Ishni o‘zgartirib bo‘lmaydi">
          {ed.reason} <LinkButton href={`/assignments/${id}`} variant="ghost" size="sm">Vazifaga qaytish</LinkButton>
        </Alert>
      ) : (
        <SubmitEditor
          assignmentId={id}
          type={a.type as "written" | "file_upload" | "homework"}
          items={a.items}
          books={d.books}
          initialProgress={d.submission?.itemProgress ?? {}}
          dueAt={a.dueAt?.toISOString() ?? null}
          late={win.late}
          latePenaltyPercent={a.latePenaltyPercent}
          isResubmission={ed.isResubmission}
          draftAllowed={!d.submission || d.submission.status === "draft" || d.submission.status === "returned"}
          initialContent={d.submission?.content ?? ""}
          initialFiles={d.submissionFiles}
          instructions={a.instructions}
        />
      )}
    </div>
  );
}
