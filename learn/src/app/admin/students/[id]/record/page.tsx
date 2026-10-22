import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { StudentRecordPage } from "@/components/staff/grading-pages";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("O‘quvchi"); } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentRecordPage user={await pageUser("admin", "super_admin")} base="/admin" studentId={id} />;
}
