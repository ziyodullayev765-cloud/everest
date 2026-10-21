import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { UserAdminPage } from "@/components/admin/user-admin";

export const metadata: Metadata = { title: "Foydalanuvchi" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserAdminPage user={await pageUser("admin", "super_admin")} id={id} back={{ href: "/admin/students", label: "O‘quvchilar" }} />;
}
