import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { recentAudit } from "@/server/services/users";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/staff/filter-bar";
import { auditLabel } from "@/components/admin/audit-labels";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Audit jurnali"); } };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await pageUser("admin", "super_admin");
  const sp = await searchParams;
  const rows = await recentAudit(user, { q: sp.q, limit: 300 });
  return (
    <>
      <PageHeader title={tr("Audit jurnali")} description={tr("Muhim harakatlar o‘zgartirib yoki o‘chirib bo‘lmaydigan jurnalga yoziladi. IP manzillar xeshlangan holda saqlanadi.")} />
      <FilterBar fields={[{ name: "q", type: "search", placeholder: tr("Harakat yoki foydalanuvchi") }]} />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-border bg-surface-2/60 text-[12px] text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">{tr("Vaqt")}</th>
                <th className="px-3 py-3 font-semibold">{tr("Kim")}</th>
                <th className="px-3 py-3 font-semibold">{tr("Harakat")}</th>
                <th className="px-5 py-3 font-semibold">{tr("Tafsilot")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-2.5 whitespace-nowrap text-muted">{formatDateTime(r.createdAt)}</td>
                  <td className="px-3 py-2.5 font-semibold">{r.actor ?? "—"}</td>
                  <td className="px-3 py-2.5">{auditLabel(r.action)} <span className="text-[11.5px] text-muted">({r.action})</span></td>
                  <td className="max-w-xs truncate px-5 py-2.5 font-mono text-[11.5px] text-muted">{Object.keys(r.meta ?? {}).length ? JSON.stringify(r.meta) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
