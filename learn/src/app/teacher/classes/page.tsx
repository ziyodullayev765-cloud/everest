import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, UsersRound } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { listClasses } from "@/server/services/classes";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Sinflar" };

export default async function Page() {
  const user = await pageUser("teacher");
  const classes = await listClasses(user);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Sinflarim" description="Sizga biriktirilgan sinflar." />
      <Card className="overflow-hidden">
        {classes.length ? (
          <ul className="divide-y divide-border">
            {classes.map((c) => (
              <li key={c.id}>
                <Link href={`/teacher/classes/${c.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary-soft font-bold text-primary-soft-fg">{c.name.slice(0, 3)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{c.name}</span>
                    <span className="text-[13px] text-muted">{c.academicYear} · {c.students} o‘quvchi</span>
                  </span>
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<UsersRound />} title="Sinf yo‘q" description="Administrator sizni sinfga biriktirgach, shu yerda ko‘rinadi." />
        )}
      </Card>
    </div>
  );
}
