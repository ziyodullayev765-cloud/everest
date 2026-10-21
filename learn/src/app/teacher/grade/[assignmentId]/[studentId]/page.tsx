import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { GradePage } from "@/components/staff/grading-pages";

export const metadata: Metadata = { title: "Baholash" };

export default async function Page({ params }: { params: Promise<{ assignmentId: string; studentId: string }> }) {
  const { assignmentId, studentId } = await params;
  return <GradePage user={await pageUser("teacher")} base="/teacher" assignmentId={assignmentId} studentId={studentId} />;
}
