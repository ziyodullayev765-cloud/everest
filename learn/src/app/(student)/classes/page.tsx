import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, UsersRound } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { studentClasses } from "@/server/services/classes";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { JoinClass } from "./join-class";

export const metadata: Metadata = { title: "Sinflarim" };

export default async function ClassesPage() {
  const user = await pageUser("student");
  const classes = await studentClasses(user.id);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Sinflarim" description="Sinflaringiz, o‘qituvchilar va e’lonlar." />
      <div className="space-y-5">
        {classes.length ? (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link href={`/classes/${c.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-[14px] font-bold text-primary-soft-fg">{c.name.slice(0, 3)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{c.name}{c.archivedAt ? " (arxiv)" : ""}</span>
                      <span className="block truncate text-[13px] text-muted">{[c.academicYear, c.subjects, c.teachers].filter(Boolean).join(" · ")}</span>
                    </span>
                    <ChevronRight className="size-4 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card>
            <EmptyState icon={<UsersRound />} title="Hali sinfga qo‘shilmagansiz" description="Administrator sizni sinfga qo‘shadi yoki o‘qituvchi bergan kod orqali qo‘shiling." />
          </Card>
        )}
        <JoinClass />
      </div>
    </div>
  );
}
