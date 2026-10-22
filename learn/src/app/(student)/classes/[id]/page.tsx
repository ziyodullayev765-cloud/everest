import type { Metadata } from "next";
import { orNotFound, pageUser } from "@/server/auth/guards";
import { classPage } from "@/server/services/classes";
import { PageHeader } from "@/components/ui/page";
import { ClassPageView } from "@/components/app/class-page-view";

export const metadata: Metadata = { title: "Guruh" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await pageUser("student");
  const data = await orNotFound(classPage(u, id));
  return (
    <>
      <PageHeader back={{ href: "/classes", label: "Guruhlarim" }} title={data.cls.name} description={data.cls.academicYear} />
      <ClassPageView data={data} />
    </>
  );
}
