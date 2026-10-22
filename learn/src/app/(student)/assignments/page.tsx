import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { listForStudent } from "@/server/services/assignments";
import { PageHeader } from "@/components/ui/page";
import { AssignmentBoard } from "@/components/student/assignment-board";

export const metadata: Metadata = { title: "Vazifalar" };

export default async function AssignmentsPage() {
  const user = await pageUser("student");
  const rows = await listForStudent(user.id);
  return (
    <>
      <PageHeader title="Vazifalar" description="Barcha vazifalar, quizlar va o‘quv materiallari — kategoriya, holat va muddat bo‘yicha saralang." />
      <AssignmentBoard rows={rows} emptyText="O‘qituvchingiz vazifa e’lon qilganda shu yerda ko‘rinadi." />
    </>
  );
}
