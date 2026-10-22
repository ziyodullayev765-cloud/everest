import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { EditAssignmentPage } from "@/components/staff/assignment-pages";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Vazifani tahrirlash"); } };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <EditAssignmentPage user={await pageUser("admin", "super_admin")} base="/admin" id={id} tab={sp.tab} />;
}
