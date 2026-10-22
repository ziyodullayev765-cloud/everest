import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { listClasses } from "@/server/services/classes";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { ClassForm } from "@/components/admin/class-forms";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Guruhlar"); } };

export default async function Page({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const user = await pageUser("admin", "super_admin");
  const sp = await searchParams;
  const rows = await listClasses(user, sp.archived === "1");
  return (
    <>
      <PageHeader
        title={tr("Guruhlar")}
        description={tr("Arxivlangan guruhlarning baholari va ishlari saqlanib qoladi.")}
        actions={
          <>
            <Link href={sp.archived === "1" ? "/admin/classes" : "/admin/classes?archived=1"} className="text-[13px] font-semibold text-muted hover:text-text">
              {sp.archived === "1" ? tr("Arxivni yashirish") : tr("Arxivni ko‘rsatish")}
            </Link>
            <ClassForm />
          </>
        }
      />
      {rows.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/classes/${c.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2/60">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary-soft font-bold text-primary-soft-fg">{c.name.slice(0, 3)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">
                      {c.name} {c.archivedAt ? <Badge className="ml-1">{tr("Arxiv")}</Badge> : null}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">{[c.level, tr("{0} o‘quvchi", c.students)].filter(Boolean).join(" · ")}{c.teachers ? ` · ${c.teachers}` : ""}</span>
                  </span>
                  {c.joinCode ? <code className="hidden rounded-lg bg-surface-2 px-2 py-1 text-[12px] sm:block">{c.joinCode}</code> : null}
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={<Layers />} title={tr("Guruh yo‘q")} description={tr("Birinchi guruhni yarating.")} />
        </Card>
      )}
    </>
  );
}
