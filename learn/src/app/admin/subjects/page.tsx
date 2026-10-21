import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { subjectsList } from "@/server/services/assignments";
import { PageHeader } from "@/components/ui/page";
import { SubjectsManager } from "@/components/admin/subjects-manager";

export const metadata: Metadata = { title: "Fanlar" };

export default async function Page() {
  await pageUser("admin", "super_admin");
  const rows = await subjectsList(true);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Fanlar" description="Arxivlangan fanlar yangi vazifalar uchun tanlanmaydi, eski baholar saqlanadi." />
      <SubjectsManager rows={rows.map((s) => ({ id: s.id, name: s.name, code: s.code, color: s.color, archived: !!s.archivedAt }))} />
    </div>
  );
}
