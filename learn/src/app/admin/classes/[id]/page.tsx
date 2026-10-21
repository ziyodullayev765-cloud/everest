import type { Metadata } from "next";
import { orNotFound, pageUser } from "@/server/auth/guards";
import { classDetailForAdmin, listTeachers, targetableStudents } from "@/server/services/classes";
import { subjectsList } from "@/server/services/assignments";
import { PageHeader } from "@/components/ui/page";
import { LinkButton } from "@/components/ui/button";
import { ClassManager } from "@/components/admin/class-forms";

export const metadata: Metadata = { title: "Sinf" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser("admin", "super_admin");
  const [d, students, teachers, subjects] = await Promise.all([orNotFound(classDetailForAdmin(user, id)), targetableStudents(user), listTeachers(), subjectsList()]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={{ href: "/admin/classes", label: "Sinflar" }} title={d.cls.name} description={d.cls.academicYear} actions={<LinkButton href={`/admin/gradebook?class=${id}`} variant="secondary" size="sm">Baholar jurnali</LinkButton>} />
      <ClassManager cls={d.cls} students={d.students} teachers={d.teachers.map((t) => ({ id: t.id, displayName: t.displayName, subjectName: t.subjectName }))} allStudents={students} allTeachers={teachers} subjects={subjects.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
