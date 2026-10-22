import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { orNotFound, pageUser } from "@/server/auth/guards";
import { attemptView } from "@/server/services/quiz";
import { QuizPlayer } from "./quiz-player";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Quiz"); } };
export const dynamic = "force-dynamic";

export default async function AttemptPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params;
  const user = await pageUser("student");
  const v = await orNotFound(attemptView(user, attemptId));
  if (v.assignment.id !== id) redirect(`/quizzes/${v.assignment.id}/attempt/${attemptId}`);
  if (v.attempt.status !== "in_progress") redirect(`/quizzes/${id}/results/${attemptId}`);
  return (
    <QuizPlayer
      attemptId={attemptId}
      assignmentId={id}
      title={v.assignment.title}
      questions={v.questions}
      initialAnswers={v.answers as Record<string, never>}
      expiresAt={v.attempt.expiresAt?.toISOString() ?? null}
      serverNow={v.attempt.serverNow.toISOString()}
      allowBack={v.assignment.allowBackNavigation}
      showOverview={v.assignment.showOverview}
      context={{ passage: v.assignment.passage, audioFileId: v.assignment.audioFileId, replayLimit: v.assignment.replayLimit, transcript: v.assignment.transcript }}
    />
  );
}
