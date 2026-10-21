import { pageUser } from "@/server/auth/guards";
import { StaffClassPage } from "@/components/staff/class-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaffClassPage user={await pageUser("teacher")} base="/teacher" id={id} back="/teacher/classes" />;
}
