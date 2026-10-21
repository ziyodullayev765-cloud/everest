import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { EditAssignmentPage } from "@/components/staff/assignment-pages";

export const metadata: Metadata = { title: "Vazifani tahrirlash" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <EditAssignmentPage user={await pageUser("teacher")} base="/teacher" id={id} tab={sp.tab} />;
}
