import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { GradePage } from "@/components/staff/grading-pages";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Baholash"); } };

export default async function Page({ params }: { params: Promise<{ assignmentId: string; studentId: string }> }) {
  const { assignmentId, studentId } = await params;
  return <GradePage user={await pageUser("admin", "super_admin")} base="/admin" assignmentId={assignmentId} studentId={studentId} />;
}
