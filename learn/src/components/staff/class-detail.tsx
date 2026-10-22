import Link from "next/link";
import type { SessionUser } from "@/server/auth/session";
import { classDetailForAdmin, classPage } from "@/server/services/classes";
import { orNotFound } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ClassPageView } from "@/components/app/class-page-view";
import { ClassTools } from "./class-tools";

export async function StaffClassPage({ user, base, id, back }: { user: SessionUser; base: string; id: string; back: string }) {
  const [page, detail] = await Promise.all([orNotFound(classPage(user, id)), orNotFound(classDetailForAdmin(user, id))]);
  return (
    <>
      <PageHeader back={{ href: back, label: "Guruhlar" }} title={page.cls.name} description={`${page.cls.academicYear} · ${detail.students.length} o‘quvchi`} />
      <ClassPageView
        data={page}
        staffTools={
          <>
            <ClassTools classId={id} />
            <Card>
              <CardHeader title="O‘quvchilar" />
              <CardBody className="pt-2">
                <ul className="-mx-2 grid sm:grid-cols-2">
                  {detail.students.map((s) => (
                    <li key={s.id}>
                      <Link href={`${base}/students/${s.id}`} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-surface-2">
                        <Avatar name={s.displayName} size={30} />
                        <span className="truncate text-[13.5px] font-medium">{s.displayName}</span>
                        {s.status === "deactivated" ? <span className="text-[11px] text-muted">(faol emas)</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </>
        }
      />
    </>
  );
}
