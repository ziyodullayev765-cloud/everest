import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { recentAudit } from "@/server/services/users";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/staff/filter-bar";
import { auditLabel } from "@/components/admin/audit-labels";

export const metadata: Metadata = { title: "Audit jurnali" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await pageUser("admin", "super_admin");
  const sp = await searchParams;
  const rows = await recentAudit(user, { q: sp.q, limit: 300 });
  return (
    <>
      <PageHeader title="Audit jurnali" description="Muhim harakatlar o‘zgartirib yoki o‘chirib bo‘lmaydigan jurnalga yoziladi. IP manzillar xeshlangan holda saqlanadi." />
      <FilterBar fields={[{ name: "q", type: "search", placeholder: "Harakat yoki foydalanuvchi" }]} />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-border bg-surface-2/60 text-[12px] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Vaqt</th>
                <th className="px-3 py-3 font-medium">Kim</th>
                <th className="px-3 py-3 font-medium">Harakat</th>
                <th className="px-5 py-3 font-medium">Tafsilot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-2.5 whitespace-nowrap text-muted">{formatDateTime(r.createdAt)}</td>
                  <td className="px-3 py-2.5 font-medium">{r.actor ?? "—"}</td>
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
