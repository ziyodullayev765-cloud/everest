import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { StudentRecordPage } from "@/components/staff/grading-pages";

export const metadata: Metadata = { title: "O‘quvchi" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentRecordPage user={await pageUser("admin", "super_admin")} base="/admin" studentId={id} />;
}
