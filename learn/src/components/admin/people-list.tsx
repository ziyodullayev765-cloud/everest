import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { listUsers } from "@/server/services/users";
import { listClasses } from "@/server/services/classes";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { PERMISSIONS } from "@/server/auth/rbac";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/avatar";
import { FilterBar } from "@/components/staff/filter-bar";
import { PeopleToolbar } from "./people-toolbar";
import { GraduationCap } from "lucide-react";
import { tr } from "@/lib/i18n/tr";

export async function PeopleList({ user, kind, sp }: { user: SessionUser; kind: "student" | "staff"; sp: { q?: string; status?: string; class?: string } }) {
  const [rows, classes] = await Promise.all([listUsers(user, { role: kind, q: sp.q, status: sp.status || "active", classId: sp.class }), listClasses(user)]);
  const base = kind === "student" ? "/admin/students" : "/admin/teachers";
  return (
    <>
      <PageHeader
        title={kind === "student" ? tr("O‘quvchilar") : tr("O‘qituvchilar va xodimlar")}
        description={tr("{0} ta hisob", rows.length)}
        actions={<PeopleToolbar kind={kind} classes={classes.map((c) => ({ id: c.id, name: c.name }))} canCreateAdmins={user.role === "super_admin"} />}
      />
      <FilterBar
        fields={[
          { name: "q", type: "search", placeholder: kind === "student" ? tr("Ism, login yoki ID") : tr("Ism yoki login") },
          { name: "status", label: tr("Holat"), options: [["active", tr("Faol")], ["deactivated", tr("Faol emas")]] },
          ...(kind === "student" ? [{ name: "class", label: tr("Guruh"), options: [["", tr("Barcha guruhlar")], ...classes.map((c) => [c.id, c.name] as [string, string])] as [string, string][] }] : []),
        ]}
      />
      {rows.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map((u) => (
              <li key={u.id}>
                <Link href={`${base}/${u.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60">
                  <Avatar name={u.displayName} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold">
                      {u.displayName} {u.status === "deactivated" ? <Badge className="ml-1">{tr("Faol emas")}</Badge> : null}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">
                      @{u.username}
                      {u.studentCode ? tr(" · ID {0}", u.studentCode) : ""}
                      {u.classNames ? ` · ${u.classNames}` : ""}
                    </span>
                  </span>
                  <span className="hidden flex-wrap justify-end gap-1 md:flex">
                    {kind === "staff" ? <Badge tone={u.role === "teacher" ? "info" : "violet"}>{t.role[u.role]}</Badge> : null}
                    {u.permissions.map((p) => (
                      <Badge key={p}>{tr(PERMISSIONS[p as keyof typeof PERMISSIONS] ?? p)}</Badge>
                    ))}
                  </span>
                  <span className="hidden w-28 shrink-0 text-right text-[12px] text-muted sm:block">{u.lastLoginAt ? `kirgan ${formatDate(u.lastLoginAt)}` : tr("hali kirmagan")}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={<GraduationCap />} title={tr("Hech kim topilmadi")} description={tr("Yangi hisob yarating yoki saralashni o‘zgartiring.")} />
        </Card>
      )}
    </>
  );
}
