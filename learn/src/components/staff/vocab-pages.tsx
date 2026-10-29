import Link from "next/link";
import { AlertTriangle, BookA, History, Upload, Users } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { getWordList, listActivity, listWordLists, LISTS_PER_PAGE, vocabQuality } from "@/server/services/vocabulary";
import { isAdmin } from "@/server/auth/rbac";
import { listClasses, targetableStudents } from "@/server/services/classes";
import { orNotFound } from "@/server/auth/guards";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { FilterBar } from "./filter-bar";
import { NewWordListButton, WordListEditor, WordListTargets } from "./vocab-editor";
import { WordListsTable } from "./vocab-bulk";
import { LinkButton } from "@/components/ui/button";
import { tr } from "@/lib/i18n/tr";

const STATUS: Record<string, { label: string; tone: "neutral" | "success" | "warning" }> = {
  draft: { get label() { return tr("Qoralama"); }, tone: "warning" },
  published: { get label() { return tr("E’lon qilingan"); }, tone: "success" },
  archived: { get label() { return tr("Arxiv"); }, tone: "neutral" },
};

export async function WordListsPage({ user, base, sp }: { user: SessionUser; base: string; sp: { q?: string; status?: string; group?: string; page?: string } }) {
  const unassigned = sp.group === "none";
  const classes = await listClasses(user);
  const classId = sp.group && classes.some((c) => c.id === sp.group) ? sp.group : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const [rows, quality] = await Promise.all([listWordLists(user, { q: sp.q, status: sp.status, classId, unassigned, page }), isAdmin(user) ? vocabQuality(user) : null]);
  const pages = Math.max(1, Math.ceil(rows.total / LISTS_PER_PAGE));
  const href = (p: number) => `${base}/vocabulary?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}), ...(sp.group ? { group: sp.group } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader
        title={tr("Lug‘at ro‘yxatlari")}
        description={tr("Ro‘yxat faqat biriktirilgan guruh(lar) o‘quvchilariga ko‘rinadi. Bitta ro‘yxatni bir nechta guruhga biriktirish mumkin — so‘zlar takrorlanmaydi.")}
        actions={
          <>
            <LinkButton href={`${base}/vocabulary/imports`} variant="ghost"><History /> {tr("Import tarixi")}</LinkButton>
            <LinkButton href={`${base}/vocabulary/import`} variant="secondary"><Upload /> {tr("Fayldan import")}</LinkButton>
            <NewWordListButton base={base} />
          </>
        }
      />
      <FilterBar
        fields={[
          { name: "q", type: "search", placeholder: tr("Nomi, daraja yoki mavzu") },
          { name: "status", label: tr("Holat"), options: [["", tr("Faol")], ["draft", tr("Qoralama")], ["published", tr("E’lon qilingan")], ["archived", tr("Arxiv")]] },
          { name: "group", label: tr("Guruh"), options: [["", tr("Barcha guruhlar")], ["none", tr("Biriktirilmaganlar")], ...classes.map((c) => [c.id, c.name] as [string, string])] },
        ]}
      />
      {rows.length ? (
        <>
          <WordListsTable
            base={base}
            classes={classes.map((c) => ({ id: c.id, name: c.name }))}
            rows={rows.map((l) => ({ id: l.id, title: l.title, level: l.level, status: l.status, words: l.words, students: l.students, groups: l.groups, authorName: l.authorName, updatedAt: l.updatedAt, canEdit: isAdmin(user) || l.createdBy === user.id }))}
          />
          <div className="mt-3 flex items-center justify-between text-[13px] text-muted">
            <span>{tr("Jami {0} ta ro‘yxat", rows.total)}</span>
            {pages > 1 ? (
              <span className="flex items-center gap-2">
                {page > 1 ? <Link className="font-bold text-primary" href={href(page - 1)}>← {tr("Oldingi")}</Link> : null}
                <span>{page} / {pages}</span>
                {page < pages ? <Link className="font-bold text-primary" href={href(page + 1)}>{tr("Keyingi")} →</Link> : null}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <Card>
          <EmptyState
            icon={<BookA />}
            title={sp.q || sp.status || sp.group ? tr("Mos ro‘yxat topilmadi") : tr("Ro‘yxatlar yo‘q")}
            description={sp.q || sp.status || sp.group ? tr("Filtrni o‘zgartirib ko‘ring.") : tr("Birinchi lug‘at ro‘yxatini yarating yoki fayldan import qiling.")}
            action={<div className="flex flex-wrap justify-center gap-2"><LinkButton href={`${base}/vocabulary/import`} variant="secondary"><Upload /> {tr("Fayldan import")}</LinkButton><NewWordListButton base={base} /></div>}
          />
        </Card>
      )}
      {quality && (quality.conflicts.length || quality.unassigned.length) ? (
        <Card className="mt-6">
          <CardHeader title={tr("Ma’lumotlar tekshiruvi")} icon={<AlertTriangle />} description={tr("Avtomatik tekshiruv: e’tibor talab qiladigan joylar")} />
          <CardBody className="space-y-4 pt-2 text-[13.5px]">
            {quality.unassigned.length ? (
              <div>
                <p className="mb-1 font-bold">{tr("E’lon qilingan, lekin hech bir guruhga biriktirilmagan ({0}):", quality.unassigned.length)}</p>
                <p className="flex flex-wrap gap-1.5">{quality.unassigned.map((l) => <Link key={l.id} prefetch={false} href={`${base}/vocabulary/${l.id}?tab=assign`} className="rounded-md bg-warning-soft px-2 py-0.5 font-semibold text-warning hover:underline">{l.title}</Link>)}</p>
              </div>
            ) : null}
            {quality.conflicts.length ? (
              <div>
                <p className="mb-1 font-bold">{tr("Bir xil so‘z turli ro‘yxatlarda turlicha tarjima qilingan ({0}):", quality.conflicts.length)}</p>
                <ul className="divide-y divide-border">
                  {quality.conflicts.slice(0, 15).map((c) => (
                    <li key={c.english} className="py-1.5">
                      <b>{c.english}</b> — {c.translations.join(" / ")}{" "}
                      <span className="text-muted">({c.lists.map((l, i) => <Link key={l.id} prefetch={false} href={`${base}/vocabulary/${l.id}`} className="hover:text-primary">{i ? ", " : ""}{l.title}</Link>)})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
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
        actions={d.canEdit ? <LinkButton href={`${base}/vocabulary/import?list=${id}`} variant="secondary"><Upload /> {tr("Fayldan import")}</LinkButton> : undefined}
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
