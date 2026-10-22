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

export const metadata: Metadata = { title: "Guruhlar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const user = await pageUser("admin", "super_admin");
  const sp = await searchParams;
  const rows = await listClasses(user, sp.archived === "1");
  return (
    <>
      <PageHeader
        title="Guruhlar"
        description="Arxivlangan guruhlarning baholari va ishlari saqlanib qoladi."
        actions={
          <>
            <Link href={sp.archived === "1" ? "/admin/classes" : "/admin/classes?archived=1"} className="text-[13px] font-medium text-muted hover:text-text">
              {sp.archived === "1" ? "Arxivni yashirish" : "Arxivni ko‘rsatish"}
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
                    <span className="block font-semibold">
                      {c.name} {c.archivedAt ? <Badge className="ml-1">Arxiv</Badge> : null}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">{[c.level, `${c.students} o‘quvchi`].filter(Boolean).join(" · ")}{c.teachers ? ` · ${c.teachers}` : ""}</span>
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
          <EmptyState icon={<Layers />} title="Guruh yo‘q" description="Birinchi guruhni yarating." />
        </Card>
      )}
    </>
  );
}
