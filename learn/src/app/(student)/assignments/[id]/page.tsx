import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpen, CalendarClock, CheckCircle2, ExternalLink, Headphones, FileText, Link2, ListTodo, MessageSquareText, RotateCcw, Scale, User } from "lucide-react";
import { orNotFound, pageUser } from "@/server/auth/guards";
import { getForStudent } from "@/server/services/assignments";
import { editability } from "@/server/services/submissions";
import { glossaryFor } from "@/server/services/vocabulary";
import { isQuizType, isWorkType, submissionWindow } from "@/lib/assignment-kinds";
import { formatDate, formatDateTime, remaining } from "@/lib/dates";
import { fmtNumber } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import { StatusBadge } from "@/components/student/status";
import { ListeningPlayer, MediaGallery } from "@/components/app/media";
import { Glossary } from "@/components/vocab/glossary";
import { HomeworkItemsList } from "@/components/app/homework-items";
import { MarkReadButton } from "./mark-read";
import { tr } from "@/lib/i18n/tr";

export async function generateMetadata(): Promise<Metadata> {
  return { title: tr("Vazifa") };
}

export default async function AssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await pageUser("student");
  const d = await orNotFound(getForStudent(user.id, id));
  const a = d.assignment;
  const glossary = a.passage ? await glossaryFor(user.id, a.passage) : [];
  if (isQuizType(a.type)) redirect(`/quizzes/${a.id}`);
  const win = submissionWindow(a);
  const ed = editability(a, d.submission, d.grade);
  const submitted = d.submission && d.submission.version > 0;
  const r = a.dueAt ? remaining(a.dueAt) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: "/assignments", label: t.nav.assignments }}
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold" style={{ color: d.subject?.color }}>
              {d.subject?.name}
            </span>
            <span aria-hidden>·</span>
            <span>{t.assignmentType[a.type]}</span>
            <StatusBadge status={d.status} />
          </span>
        }
        title={a.title}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          {d.status === "returned" ? (
            <Alert tone="warning" title={tr("O‘qituvchi ishni qayta ishlashga qaytardi")}>
              {tr("Izohni o‘qing va ishingizni yangilab, qayta topshiring.")}
            </Alert>
          ) : null}
          {a.description || a.instructions ? (
            <Card>
              <CardBody className="space-y-5">
                {a.description ? <RichText text={a.description} className="text-[15px] text-text-2" /> : null}
                {a.instructions ? (
                  <div>
                    <h2 className="mb-2 text-[13px] font-bold tracking-[0.04em] text-muted uppercase">{tr("Ko‘rsatmalar")}</h2>
                    <RichText text={a.instructions} className="text-[14.5px] text-text" />
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {a.passage ? (
            <Card>
              <CardHeader title={tr("Reading matni")} icon={<BookOpen />} description={[a.level, a.topic].filter(Boolean).join(" · ") || undefined} />
              <CardBody className="pt-3">
                <div className="prose-text text-[15.5px] leading-[1.75]">{a.passage}</div>
                {glossary.length ? <Glossary items={glossary} /> : null}
              </CardBody>
            </Card>
          ) : null}

          {a.audioFileId ? (
            <Card>
              <CardHeader title={tr("Listening")} icon={<Headphones />} />
              <CardBody className="space-y-3 pt-3">
                <ListeningPlayer fileId={a.audioFileId} limit={a.replayLimit} storageKey={`asg:${a.id}`} />
                {a.transcript && (a.transcriptMode === "always" || (a.transcriptMode === "after_submit" && submitted)) ? (
                  <details className="rounded-xl bg-surface-2 px-4 py-3 text-[14px]">
                    <summary className="cursor-pointer font-semibold">{tr("Transkript")}</summary>
                    <div className="prose-text mt-2 text-text-2">{a.transcript}</div>
                  </details>
                ) : a.transcript && a.transcriptMode === "after_submit" ? (
                  <p className="text-[12.5px] text-muted">{tr("Transkript ishni topshirganingizdan keyin ochiladi.")}</p>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {a.type === "homework" && a.items.length ? (
            <Card>
              <CardHeader title={tr("Topshiriqlar")} icon={<ListTodo />} description={tr("{0} ta topshiriq", a.items.length)} />
              <CardBody className="pt-3">
                <HomeworkItemsList items={a.items} books={d.books} progress={d.submission && d.submission.version > 0 ? d.submission.itemProgress : null} />
              </CardBody>
            </Card>
          ) : null}

          {d.attachments.length ? (
            <Card>
              <CardHeader title={tr("Materiallar")} description={tr("Doska rasmi, audio va fayllar")} icon={<Link2 />} />
              <CardBody className="pt-3">
                <MediaGallery files={d.attachments} />
              </CardBody>
            </Card>
          ) : null}

          {a.links.length ? (
            <Card>
              <CardHeader title={tr("Havolalar")} icon={<ExternalLink />} />
              <CardBody className="grid gap-2 pt-3 sm:grid-cols-2">
                {a.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2.5 rounded-xl border border-border bg-surface p-2 pr-3 hover:border-border-strong">
                    <span className="grid size-8 place-items-center rounded-lg bg-info-soft text-info">
                      <ExternalLink className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">{l.title}</span>
                      <span className="block truncate text-[11.5px] text-muted">{new URL(l.url).host}</span>
                    </span>
                  </a>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {a.rubric.length ? (
            <Card>
              <CardHeader title={tr("Baholash mezonlari")} icon={<Scale />} />
              <CardBody className="pt-3">
                <ul className="divide-y divide-border">
                  {a.rubric.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-4 py-2.5">
                      <div>
                        <div className="text-[14px] font-semibold">{c.title}</div>
                        {c.description ? <div className="text-[13px] text-muted">{c.description}</div> : null}
                      </div>
                      <div className="shrink-0 text-[13px] text-text-2 tabular">
                        {d.grade?.rubricScores?.[c.id] != null && d.grade.status === "final" ? <b className="text-text">{d.grade.rubricScores[c.id]} / </b> : null}
                        {tr("{0} ball", c.maxPoints)}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {isWorkType(a.type) && submitted ? (
            <Card>
              <CardHeader
                title={tr("Mening ishim")}
                icon={<FileText />}
                description={
                  <>
                    {tr("{0} {1} da topshirilgan{2}", d.submission!.version > 1 ? tr("{0}-topshiriq · ", d.submission!.version) : "", formatDateTime(d.submission!.submittedAt!), d.submission!.isLate ? tr(" · kechikkan") : "")}
                  </>
                }
              />
              <CardBody className="space-y-3 pt-3">
                {d.submission!.content ? <div className="rounded-xl bg-surface-2 p-4 text-[14px]"><RichText text={d.submission!.content} /></div> : null}
                {d.submissionFiles.length ? <MediaGallery files={d.submissionFiles} /> : null}
              </CardBody>
            </Card>
          ) : null}

          {d.feedback.length ? (
            <Card>
              <CardHeader title={tr("O‘qituvchi izohlari")} icon={<MessageSquareText />} />
              <CardBody className="space-y-3 pt-3">
                {d.feedback.map((f) => (
                  <div key={f.id} className={f.kind === "revision_request" ? "rounded-xl border border-warning/25 bg-warning-soft p-4" : "rounded-xl bg-surface-2 p-4"}>
                    <div className="mb-1.5 flex items-center gap-2 text-[12.5px] text-muted">
                      {f.kind === "revision_request" ? <RotateCcw className="size-3.5 text-warning" aria-hidden /> : null}
                      <b className="font-bold text-text-2">{f.author}</b> · {formatDateTime(f.createdAt)}
                    </div>
                    <RichText text={f.body} className="text-[14px] text-text" />
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {d.grade && (d.grade.status === "final" || d.status === "reviewing") ? (
            <Card className="overflow-hidden">
              <div className="bg-primary-soft px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-primary-soft-fg">{tr("Baho")}</span>
                  <Badge tone={d.grade.status === "final" ? "success" : "warning"}>{t.gradeStatus[d.grade.status]}</Badge>
                </div>
                <div className="mt-2 flex items-baseline gap-2 tabular">
                  <span className="text-[34px] leading-none font-bold text-text">{fmtNumber(d.grade.points, 2)}</span>
                  <span className="text-[15px] text-muted">/ {fmtNumber(d.grade.maxPoints, 2)}</span>
                  <span className="ml-auto grid size-11 place-items-center rounded-xl bg-surface text-[20px] font-bold text-primary shadow-soft">{d.grade.scaleLabel}</span>
                </div>
                <div className="mt-1 text-[13px] text-muted tabular">{fmtNumber(d.grade.percent, 1)}%</div>
              </div>
              {d.grade.latePenaltyApplied > 0 ? <p className="px-5 py-3 text-[12.5px] text-muted">{tr("Kechikish uchun −{0} ball hisobga olingan.", fmtNumber(d.grade.latePenaltyApplied, 2))}</p> : null}
              {d.grade.status === "provisional" ? <p className="px-5 py-3 text-[12.5px] text-muted">{tr("Bu dastlabki baho — o‘qituvchi uni hali yakunlamagan.")}</p> : null}
            </Card>
          ) : null}

          <Card>
            <CardBody className="space-y-3.5 text-[13.5px]">
              <Meta icon={<User />} label={tr("O‘qituvchi")} value={d.authorName} />
              <Meta icon={<CalendarClock />} label={tr("Muddat")} value={a.dueAt ? formatDateTime(a.dueAt) : t.common.noDeadline} extra={r && !submitted ? <span className={r.overdue ? "text-danger" : r.hours < 24 ? "text-warning" : "text-muted"} suppressHydrationWarning>{r.text}</span> : null} />
              {a.type !== "material" ? <Meta icon={<Scale />} label={tr("Maksimal ball")} value={tr("{0} ball", fmtNumber(a.maxScore, 2))} /> : null}
              {a.publishedAt ? <Meta icon={<CheckCircle2 />} label={tr("E’lon qilingan")} value={formatDate(a.publishedAt)} /> : null}
              {isWorkType(a.type) ? (
                <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
                  {a.allowLate ? tr("Kechikib topshirish mumkin{0}{1}.", a.latePenaltyPercent ? tr(" (−{0}% ball)", a.latePenaltyPercent) : "", a.lateCutoffAt ? tr(", {0} gacha", formatDateTime(a.lateCutoffAt)) : "") : tr("Muddatdan keyin topshirib bo‘lmaydi.")}{" "}
                  {a.allowResubmission ? tr("Qayta topshirish: {0} marta.", a.maxResubmissions) : tr("Qayta topshirish yo‘q.")}
                </div>
              ) : null}
            </CardBody>
          </Card>

          {a.type === "material" ? (
            d.status === "read" ? (
              <Alert tone="success">{tr("Siz bu materialni o‘qib chiqdingiz.")}</Alert>
            ) : (
              <MarkReadButton assignmentId={a.id} />
            )
          ) : isWorkType(a.type) ? (
            ed.canEdit ? (
              <LinkButton href={`/assignments/${a.id}/submit`} size="lg" className="w-full">
                {d.status === "returned" ? tr("Qayta ishlash") : submitted ? tr("Qayta topshirish") : d.status === "in_progress" ? tr("Davom ettirish") : win.late ? tr("Kechikib topshirish") : tr("Bajarishni boshlash")}
              </LinkButton>
            ) : !submitted ? (
              <Alert tone="danger">{ed.reason}</Alert>
            ) : null
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Meta({ icon, label, value, extra }: { icon: React.ReactNode; label: string; value: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-muted [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <div className="text-[12px] text-muted">{label}</div>
        <div className="font-semibold text-text">{value}</div>
        {extra ? <div className="text-[12.5px]">{extra}</div> : null}
      </div>
    </div>
  );
}
