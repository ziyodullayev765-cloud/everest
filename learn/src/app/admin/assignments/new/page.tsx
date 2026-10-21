import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { NewAssignmentPage } from "@/components/staff/assignment-pages";

export const metadata: Metadata = { title: "Yangi vazifa" };

export default async function Page() {
  return <NewAssignmentPage user={await pageUser("admin", "super_admin")} base="/admin" />;
}
