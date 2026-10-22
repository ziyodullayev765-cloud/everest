import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { PreviewAssignmentPage } from "@/components/staff/assignment-pages";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Ko‘rib chiqish"); } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PreviewAssignmentPage user={await pageUser("teacher")} base="/teacher" id={id} />;
}
