import type { Metadata } from "next";
import { orNotFound, pageUser } from "@/server/auth/guards";
import { classDetailForAdmin, listTeachers, targetableStudents } from "@/server/services/classes";
import { PageHeader } from "@/components/ui/page";
import { LinkButton } from "@/components/ui/button";
import { ClassManager } from "@/components/admin/class-forms";
import { GroupVocabCard } from "@/components/staff/group-vocab";
import { classVocabulary, listWordLists } from "@/server/services/vocabulary";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Guruh"); } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser("admin", "super_admin");
  const [d, students, teachers, vocab, lists] = await Promise.all([orNotFound(classDetailForAdmin(user, id)), targetableStudents(user), listTeachers(), classVocabulary(user, id), listWordLists(user, { page: 1 })]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={{ href: "/admin/classes", label: tr("Guruhlar") }} title={d.cls.name} description={[d.cls.level, d.cls.description].filter(Boolean).join(" · ") || undefined} actions={<LinkButton href={`/admin/gradebook?class=${id}`} variant="secondary" size="sm">{tr("Baholar jurnali")}</LinkButton>} />
      <ClassManager cls={d.cls} students={d.students} teachers={d.teachers.map((t) => ({ id: t.id, displayName: t.displayName }))} allStudents={students} allTeachers={teachers} />
      <GroupVocabCard classId={id} base="/admin" assigned={vocab} available={lists.filter((l) => !vocab.some((v) => v.id === l.id)).map((l) => ({ id: l.id, title: l.title, status: l.status }))} />
    </div>
  );
}
