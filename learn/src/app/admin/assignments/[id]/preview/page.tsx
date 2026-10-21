import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { PreviewAssignmentPage } from "@/components/staff/assignment-pages";

export const metadata: Metadata = { title: "Ko‘rib chiqish" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PreviewAssignmentPage user={await pageUser("admin", "super_admin")} base="/admin" id={id} />;
}
