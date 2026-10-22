import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Eye, FileText, Plus, Users } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { can } from "@/server/auth/rbac";
import { getForEditing, listForStaff, subjectsList } from "@/server/services/assignments";
import { listClasses, targetableStudents } from "@/server/services/classes";
import { listBank } from "@/server/services/bank";
import { bookOptions } from "@/server/services/library";
import { getSettings } from "@/server/services/settings";
import { orNotFound } from "@/server/auth/guards";
import { isQuizType } from "@/lib/assignment-kinds";
import { formatDateTime, toLocalInput } from "@/lib/dates";
import { countBlanks } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { AudioPlayer } from "@/components/app/media";
import type { QuestionConfig } from "@/server/db/schema";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import { FileChip } from "@/components/app/uploader";
import { AssignmentBuilder, type BuilderValue } from "./assignment-builder";
import { QuestionEditor, type EditQuestion } from "./question-editor";
import { AssignmentActions } from "./assignment-actions";
import { FilterBar } from "./filter-bar";

export const PUBLISH_TONE: Record<string, Tone> = { draft: "neutral", scheduled: "info", published: "success", archived: "warning" };

export async function AssignmentListPage({ user, base, sp }: { user: SessionUser; base: string; sp: { status?: string; type?: string; subject?: string; q?: string } }) {
  const [rows, subjects] = await Promise.all([listForStaff(user, { status: sp.status, type: sp.type, subjectId: sp.subject, q: sp.q }), subjectsList()]);
  return (
    <>
      <PageHeader
        title="Vazifa va quizlar"
        description="Yaratish, e’lon qilish, rejalashtirish va arxivlash."
        actions={can(user, "assignments.create") ? <LinkButton href={`${base}/assignments/new`}><Plus /> Yangi vazifa</LinkButton> : null}
      />
      <FilterBar
        fields={[
          { name: "q", type: "search", placeholder: "Sarlavha bo‘yicha qidirish" },
          { name: "status", label: "Holat", options: [["", "Faol (arxivsiz)"], ["draft", "Qoralama"], ["scheduled", "Rejalashtirilgan"], ["published", "E’lon qilingan"], ["archived", "Arxiv"]] },
          { name: "type", label: "Turi", options: [["", "Barcha turlar"], ["work", "Vazifalar"], ["quiz", "Quizlar"]] },
          { name: "subject", label: "Kategoriya", options: [["", "Barcha kategoriyalar"], ...subjects.map((s) => [s.id, s.name] as [string, string])] },
        ]}
      />
      {rows.length ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13.5px]">
              <thead className="border-b border-border bg-surface-2/60 text-[12px] text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Vazifa</th>
                  <th className="px-3 py-3 font-medium">Holat</th>
                  <th className="px-3 py-3 font-medium">Muddat</th>
                  <th className="px-3 py-3 font-medium">Topshirgan</th>
                  <th className="px-3 py-3 font-medium">Tekshirish</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-2/50">
                    <td className="px-5 py-3">
                      <Link href={`${base}/assignments/${a.id}`} className="font-semibold hover:text-primary">
                        {a.title}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                        <span className="size-2 rounded-full" style={{ background: a.subjectColor }} />
                        {a.subjectName} · {t.assignmentType[a.type]} · {a.authorName}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={PUBLISH_TONE[a.status]}>{t.publishStatus[a.status]}</Badge>
                      {a.status === "scheduled" && a.publishAt ? <div className="mt-1 text-[11.5px] text-muted">{formatDateTime(a.publishAt)}</div> : null}
                    </td>
                    <td className="px-3 py-3 text-muted">{a.dueAt ? formatDateTime(a.dueAt) : "—"}</td>
                    <td className="px-3 py-3 tabular">{a.submittedCount}</td>
                    <td className="px-3 py-3">{a.pendingCount ? <Badge tone="violet">{a.pendingCount} ta</Badge> : <span className="text-muted">—</span>}</td>
                    <td className="px-5 py-3 text-right">
                      <LinkButton href={`${base}/submissions?assignment=${a.id}`} variant="ghost" size="sm">
                        Ishlar
                      </LinkButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={<FileText />} title="Vazifa topilmadi" description="Yangi vazifa yarating yoki saralashni o‘zgartiring." action={can(user, "assignments.create") ? <LinkButton href={`${base}/assignments/new`}><Plus /> Yangi vazifa</LinkButton> : null} />
        </Card>
      )}
    </>
  );
}

async function builderData(user: SessionUser) {
  const [subjects, classes, students, books] = await Promise.all([subjectsList(), listClasses(user), targetableStudents(user), bookOptions()]);
  return { subjects: subjects.map((s) => ({ id: s.id, name: s.name })), classes: classes.map((c) => ({ id: c.id, name: c.name, students: c.students })), students, books };
}

export async function NewAssignmentPage({ user, base }: { user: SessionUser; base: string }) {
  if (!can(user, "assignments.create")) notFound();
  const [data, settings] = await Promise.all([builderData(user), getSettings()]);
  const d = settings.assignmentDefaults;
  const initial: BuilderValue = {
    title: "",
    description: "",
    instructions: "",
    type: "homework",
    subjectId: data.subjects[0]?.id ?? "",
    dueAt: "",
    publishMode: "now",
    publishAt: "",
    maxScore: d.maxScore,
    allowLate: d.allowLate,
    latePenaltyPercent: d.latePenaltyPercent,
    lateCutoffAt: "",
    allowResubmission: false,
    maxResubmissions: 1,
    timeLimitMinutes: "",
    maxAttempts: d.maxAttempts,
    passingPercent: 60,
    shuffleQuestions: false,
    shuffleOptions: false,
    allowBackNavigation: true,
    showOverview: true,
    reviewMode: d.reviewMode,
    showCorrectAnswers: true,
    links: [],
    rubric: [],
    classIds: [],
    studentIds: [],
    items: [],
  };
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={{ href: `${base}/assignments`, label: "Vazifalar" }} title="Yangi vazifa" />
      <AssignmentBuilder base={base} id={null} initial={initial} initialAttachments={[]} status={null} hasWork={false} {...data} />
    </div>
  );
}

export async function EditAssignmentPage({ user, base, id, tab }: { user: SessionUser; base: string; id: string; tab?: string }) {
  const e = await orNotFound(getForEditing(user, id));
  const a = e.assignment;
  const quiz = isQuizType(a.type);
  const current = quiz && tab === "questions" ? "questions" : "details";
  const [data, bank] = await Promise.all([builderData(user), quiz && can(user, "assignments.create") ? listBank(user, a.subjectId) : Promise.resolve([])]);
  const initial: BuilderValue = {
    title: a.title,
    description: a.description,
    instructions: a.instructions,
    type: a.type,
    subjectId: a.subjectId,
    dueAt: toLocalInput(a.dueAt),
    publishMode: a.status === "scheduled" ? "schedule" : a.status === "published" ? "now" : "draft",
    publishAt: toLocalInput(a.publishAt),
    maxScore: Number(a.maxScore),
    allowLate: a.allowLate,
    latePenaltyPercent: a.latePenaltyPercent,
    lateCutoffAt: toLocalInput(a.lateCutoffAt),
    allowResubmission: a.allowResubmission,
    maxResubmissions: a.maxResubmissions,
    timeLimitMinutes: a.timeLimitMinutes ?? "",
    maxAttempts: a.maxAttempts,
    passingPercent: a.passingPercent,
    shuffleQuestions: a.shuffleQuestions,
    shuffleOptions: a.shuffleOptions,
    allowBackNavigation: a.allowBackNavigation,
    showOverview: a.showOverview,
    reviewMode: a.reviewMode,
    showCorrectAnswers: a.showCorrectAnswers,
    links: a.links,
    rubric: a.rubric,
    classIds: e.targets.filter((x) => x.classId).map((x) => x.classId!),
    studentIds: e.targets.filter((x) => x.studentId).map((x) => x.studentId!),
    items: a.items,
  };
  const questions: EditQuestion[] = e.questions.map((q) => {
    const cfg = q.config as QuestionConfig;
    return {
      key: q.id,
      type: q.type,
      prompt: q.prompt,
      points: Number(q.points),
      explanation: q.explanation,
      imageFileId: q.imageFileId,
      options: q.options.map((o) => ({ label: o.label, isCorrect: o.isCorrect })),
      accepted:
        q.type === "fill_blank"
          ? Array.from({ length: countBlanks(q.prompt) }, (_, i) => cfg.accepted?.[i] ?? [])
          : q.type === "arrange_words"
            ? [(cfg.accepted?.[0] ?? []).slice(1)]
            : q.type === "irregular_verb"
              ? [cfg.accepted?.[0] ?? [], cfg.accepted?.[1] ?? []]
              : (cfg.accepted ?? [[]]),
      caseSensitive: !!cfg.caseSensitive,
      pairs: (cfg.pairs ?? []).map((p) => ({ left: p.left, right: p.right })),
      words: cfg.words ?? [],
      direction: cfg.direction ?? (q.type === "translation" ? "en_uz" : null),
      incorrect: cfg.incorrect ?? "",
      base: cfg.base ?? "",
      audioFileId: cfg.audioFileId ?? null,
    };
  });
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: `${base}/assignments`, label: "Vazifalar" }}
        eyebrow={
          <span className="flex items-center gap-2">
            <Badge tone={PUBLISH_TONE[a.status]}>{t.publishStatus[a.status]}</Badge> {t.assignmentType[a.type]}
          </span>
        }
        title={a.title}
        actions={<AssignmentActions id={a.id} base={base} status={a.status} canDuplicate={can(user, "assignments.create")} />}
      />
      {quiz ? (
        <nav className="mb-5 inline-flex rounded-xl border border-border bg-surface-2 p-1" aria-label="Bo‘limlar">
          {[
            ["details", "Sozlamalar"],
            ["questions", `Savollar (${e.questions.length})`],
          ].map(([k, l]) => (
            <Link key={k} href={`${base}/assignments/${a.id}${k === "questions" ? "?tab=questions" : ""}`} className={cn("rounded-lg px-4 py-1.5 text-[13.5px] font-medium text-muted", current === k && "bg-surface text-text shadow-soft")} aria-current={current === k ? "page" : undefined}>
              {l}
            </Link>
          ))}
        </nav>
      ) : null}
      {current === "questions" ? (
        <QuestionEditor assignmentId={a.id} initial={questions} locked={e.questionsLocked} status={a.status} bank={bank.map((b) => ({ id: b.id, type: b.type, prompt: b.prompt, points: Number(b.points), subjectName: b.subjectName, ownerName: b.ownerName }))} subjectId={a.subjectId} />
      ) : (
        <AssignmentBuilder base={base} id={a.id} initial={initial} initialAttachments={e.attachments} status={a.status} hasWork={e.questionsLocked} {...data} />
      )}
    </div>
  );
}

/** What a student will see — rendered from the same data, without answers. */
export async function PreviewAssignmentPage({ user, base, id }: { user: SessionUser; base: string; id: string }) {
  const e = await orNotFound(getForEditing(user, id));
  const a = e.assignment;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ href: `${base}/assignments/${id}`, label: "Tahrirlash" }} eyebrow={<Badge tone="info"><Eye className="size-3.5" /> O‘quvchi ko‘rinishi (ko‘rib chiqish)</Badge>} title={a.title} />
      <div className="space-y-4">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-4 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-4" /> {a.dueAt ? formatDateTime(a.dueAt) : "Muddatsiz"}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="size-4" /> {e.targets.length} ta maqsadli guruh/o‘quvchi</span>
              {a.type !== "material" ? <span>max {Number(a.maxScore)} ball</span> : null}
            </div>
            {a.description ? <RichText text={a.description} className="text-text-2" /> : null}
            {a.instructions ? <RichText text={a.instructions} /> : null}
            {e.attachments.length ? <div className="grid gap-2 sm:grid-cols-2">{e.attachments.map((f) => <FileChip key={f.id} f={f} />)}</div> : null}
          </CardBody>
        </Card>
        {e.questions.map((q, i) => (
          <Card key={q.id}>
            <CardHeader title={`${i + 1}-savol`} description={`${t.questionType[q.type]} · ${Number(q.points)} ball`} />
            <CardBody className="space-y-2 pt-3">
              <RichText text={q.prompt} className="font-medium" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {q.imageFileId ? <img src={`/api/files/${q.imageFileId}`} alt="" className="max-h-60 rounded-xl border border-border" /> : null}
              {q.options.map((o) => (
                <div key={o.id} className="rounded-xl border border-border px-3.5 py-2.5 text-[14px]"><RichText text={o.label} as="span" /></div>
              ))}
              {(q.config as QuestionConfig).pairs?.map((p) => (
                <div key={p.id} className="grid grid-cols-2 gap-2 text-[14px]"><span className="rounded-xl border border-border px-3 py-2">{p.left}</span><span className="rounded-xl border border-dashed border-border px-3 py-2 text-muted">Tanlang…</span></div>
              ))}
              {(q.config as QuestionConfig).audioFileId ? <AudioPlayer file={{ id: (q.config as QuestionConfig).audioFileId!, name: "Audio", size: 0 }} title="Savol audiosi" /> : null}
              {q.type === "arrange_words" ? (
                <div className="flex flex-wrap gap-2">{[...((q.config as QuestionConfig).words ?? [])].sort().map((w, k) => <span key={k} className="rounded-lg border border-border px-3 py-1.5 text-[14px]">{w}</span>)}</div>
              ) : null}
              {q.type === "grammar_correction" ? <div className="rounded-xl bg-danger-soft/60 px-3.5 py-2.5 text-[14px]">{(q.config as QuestionConfig).incorrect}</div> : null}
              {q.type === "irregular_verb" ? <div className="text-[14px]">V1: <b>{(q.config as QuestionConfig).base}</b> · V2: ____ · V3: ____</div> : null}
              {["short_answer", "essay", "fill_blank", "translation", "grammar_correction"].includes(q.type) ? <div className="h-11 rounded-xl border border-dashed border-border" aria-hidden /> : null}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
