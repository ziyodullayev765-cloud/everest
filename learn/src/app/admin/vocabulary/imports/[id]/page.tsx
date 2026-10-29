import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { ImportDetailPage } from "@/components/staff/vocab-import-pages";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Import natijasi"); } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ImportDetailPage user={await pageUser("admin", "super_admin")} base="/admin" id={(await params).id} />;
}
