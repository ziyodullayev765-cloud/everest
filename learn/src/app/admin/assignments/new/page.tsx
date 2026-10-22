import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { NewAssignmentPage } from "@/components/staff/assignment-pages";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Yangi vazifa"); } };

export default async function Page() {
  return <NewAssignmentPage user={await pageUser("admin", "super_admin")} base="/admin" />;
}
