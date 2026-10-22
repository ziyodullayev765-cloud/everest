import Link from "next/link";
import type { SessionUser } from "@/server/auth/session";
import { classDetailForAdmin, classPage } from "@/server/services/classes";
import { orNotFound } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ClassPageView } from "@/components/app/class-page-view";
import { ClassTools } from "./class-tools";
import { tr } from "@/lib/i18n/tr";

export async function StaffClassPage({ user, base, id, back }: { user: SessionUser; base: string; id: string; back: string }) {
  const [page, detail] = await Promise.all([orNotFound(classPage(user, id)), orNotFound(classDetailForAdmin(user, id))]);
  return (
    <>
      <PageHeader back={{ href: back, label: tr("Guruhlar") }} title={page.cls.name} description={tr("{0} · {1} o‘quvchi", page.cls.academicYear, detail.students.length)} />
      <ClassPageView
        data={page}
        staffTools={
          <>
            <ClassTools classId={id} />
            <Card>
              <CardHeader title={tr("O‘quvchilar")} />
              <CardBody className="pt-2">
                <ul className="-mx-2 grid sm:grid-cols-2">
                  {detail.students.map((s) => (
                    <li key={s.id}>
                      <Link href={`${base}/students/${s.id}`} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-surface-2">
                        <Avatar name={s.displayName} size={30} />
                        <span className="truncate text-[13.5px] font-semibold">{s.displayName}</span>
                        {s.status === "deactivated" ? <span className="text-[11px] text-muted">{tr("(faol emas)")}</span> : null}
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
