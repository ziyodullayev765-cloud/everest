import Link from "next/link";
import { BookA, ChevronRight, Users } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { getWordList, listActivity, listWordLists } from "@/server/services/vocabulary";
import { listClasses, targetableStudents } from "@/server/services/classes";
import { orNotFound } from "@/server/auth/guards";
import { formatDate, formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar } from "./filter-bar";
import { NewWordListButton, WordListEditor, WordListTargets } from "./vocab-editor";
import { tr } from "@/lib/i18n/tr";

const STATUS: Record<string, { label: string; tone: "neutral" | "success" | "warning" }> = {
  draft: { get label() { return tr("Qoralama"); }, tone: "warning" },
  published: { get label() { return tr("E’lon qilingan"); }, tone: "success" },
  archived: { get label() { return tr("Arxiv"); }, tone: "neutral" },
};

export async function WordListsPage({ user, base, sp }: { user: SessionUser; base: string; sp: { q?: string; status?: string } }) {
  const rows = await listWordLists(user, { q: sp.q, status: sp.status });
  return (
    <>
      <PageHeader title={tr("Lug‘at ro‘yxatlari")} description={tr("So‘zlar ro‘yxatini yarating, CSV’dan import qiling va guruhlarga biriktiring.")} actions={<NewWordListButton base={base} />} />
      <FilterBar
        fields={[
          { name: "q", type: "search", placeholder: tr("Ro‘yxat nomi") },
          { name: "status", label: tr("Holat"), options: [["", tr("Faol")], ["draft", tr("Qoralama")], ["published", tr("E’lon qilingan")], ["archived", tr("Arxiv")]] },
        ]}
      />
      {rows.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map((l) => (
              <li key={l.id}>
                <Link href={`${base}/vocabulary/${l.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2/60">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
                    <BookA className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{l.title}</span>
                      <Badge tone={STATUS[l.status]?.tone}>{STATUS[l.status]?.label}</Badge>
                      {l.level ? <Badge>{l.level}</Badge> : null}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {tr("{0} ta so‘z ·", l.words)} {l.targets ? tr("{0} ta biriktirish", l.targets) : tr("biriktirilmagan")} · {l.authorName} · {formatDate(l.updatedAt)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={<BookA />} title={tr("Ro‘yxatlar yo‘q")} description={tr("Birinchi lug‘at ro‘yxatini yarating.")} action={<NewWordListButton base={base} />} />
        </Card>
      )}
    </>
  );
}

export async function WordListDetailPage({ user, base, id, tab }: { user: SessionUser; base: string; id: string; tab?: string }) {
  const d = await orNotFound(getWordList(user, id));
  const current = tab === "assign" || tab === "activity" ? tab : "words";
  const tabs = [
    ["words", tr("So‘zlar ({0})", d.words.length)],
    ["assign", tr("Biriktirish")],
    ["activity", tr("Faollik")],
  ] as const;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back={{ href: `${base}/vocabulary`, label: tr("Lug‘at ro‘yxatlari") }}
        eyebrow={<Badge tone={STATUS[d.list.status]?.tone}>{STATUS[d.list.status]?.label}</Badge>}
        title={d.list.title}
        description={[d.list.level, d.list.topic].filter(Boolean).join(" · ") || undefined}
      />
      <nav className="mb-5 flex gap-1 rounded-xl bg-surface-2 p-1" aria-label={tr("Bo‘limlar")}>
        {tabs.map(([k, l]) => (
          <Link key={k} href={`${base}/vocabulary/${id}${k === "words" ? "" : `?tab=${k}`}`} aria-current={current === k ? "page" : undefined} className={cn("flex-1 rounded-lg px-3 py-2 text-center text-[13.5px] font-semibold", current === k ? "bg-surface text-text shadow-soft" : "text-muted hover:text-text")}>
            {l}
          </Link>
        ))}
      </nav>
      {current === "words" ? (
        <WordListEditor list={{ id: d.list.id, title: d.list.title, description: d.list.description, level: d.list.level, topic: d.list.topic, status: d.list.status }} words={d.words} canEdit={d.canEdit} />
      ) : current === "assign" ? (
        <AssignTab user={user} id={id} targets={d.targets} published={d.list.status === "published"} />
      ) : (
        <ActivityTab user={user} id={id} />
      )}
    </div>
  );
}

async function AssignTab({ user, id, targets, published }: { user: SessionUser; id: string; targets: { classId: string | null; studentId: string | null }[]; published: boolean }) {
  const [classes, students] = await Promise.all([listClasses(user), targetableStudents(user)]);
  return (
    <WordListTargets
      listId={id}
      published={published}
      classes={classes.map((c) => ({ id: c.id, name: c.name, students: c.students }))}
      students={students}
      initialClassIds={targets.filter((t) => t.classId && classes.some((c) => c.id === t.classId)).map((t) => t.classId!)}
      initialStudentIds={targets.filter((t) => t.studentId && students.some((s) => s.id === t.studentId)).map((t) => t.studentId!)}
    />
  );
}

async function ActivityTab({ user, id }: { user: SessionUser; id: string }) {
  const rows = await listActivity(user, id);
  return (
    <Card className="overflow-hidden">
      <CardHeader title={tr("O‘quvchilar faolligi")} icon={<Users />} description={tr("Takrorlash tarixidan hisoblangan")} />
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead className="bg-surface-2 text-left text-[12px] text-muted">
              <tr>
                <th className="px-4 py-2.5 font-semibold">{tr("O‘quvchi")}</th>
                <th className="px-3 py-2.5 font-semibold">{tr("O‘rgangan")}</th>
                <th className="px-3 py-2.5 font-semibold">{tr("Puxta")}</th>
                <th className="px-3 py-2.5 font-semibold">{tr("Takrorlash kerak")}</th>
                <th className="px-3 py-2.5 font-semibold">{tr("Aniqlik")}</th>
                <th className="px-3 py-2.5 font-semibold">{tr("Oxirgi mashq")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 font-semibold">{r.name}</td>
                  <td className="px-3 py-2.5 tabular">{r.learned}</td>
                  <td className="px-3 py-2.5 tabular">{r.mastered}</td>
                  <td className="px-3 py-2.5 tabular">{r.due || "—"}</td>
                  <td className="px-3 py-2.5 tabular">{r.accuracy == null ? "—" : `${r.accuracy}%`}</td>
                  <td className="px-3 py-2.5 text-muted">{r.last ? formatDateTime(r.last) : tr("hali yo‘q")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <CardBody>
          <p className="py-6 text-center text-[13.5px] text-muted">{tr("Ro‘yxat hali hech kimga biriktirilmagan.")}</p>
        </CardBody>
      )}
    </Card>
  );
}
