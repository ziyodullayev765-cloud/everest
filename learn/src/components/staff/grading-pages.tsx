import Link from "next/link";
import { ClipboardCheck, Download, FileSpreadsheet, History, Inbox, MessageSquareText } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { can } from "@/server/auth/rbac";
import { gradebook, gradingContext, submissionQueue } from "@/server/services/grades";
import { attemptsForGrading } from "@/server/services/quiz";
import { listClasses } from "@/server/services/classes";
import { subjectsList } from "@/server/services/assignments";
import { listBank } from "@/server/services/bank";
import { studentRecord } from "@/server/services/users";
import { orNotFound } from "@/server/auth/guards";
import { isQuizType } from "@/lib/assignment-kinds";
import { formatDate, formatDateTime } from "@/lib/dates";
import { cn, fmtNumber, fmtPercent } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { QuestionConfig } from "@/server/db/schema";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Alert } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import { Avatar } from "@/components/ui/avatar";
import { MediaGallery } from "@/components/app/media";
import { HomeworkItemsList } from "@/components/app/homework-items";
import { FilterBar } from "./filter-bar";
import { GradeForm, QuizGradeForm, FinalizeButton } from "./grade-forms";
import { BankManager } from "./bank-manager";

export async function SubmissionsPage({ user, base, sp }: { user: SessionUser; base: string; sp: { status?: string; class?: string; subject?: string; assignment?: string; q?: string } }) {
  const status = sp.status ?? "pending";
  const [rows, classes, subjects] = await Promise.all([
    submissionQueue(user, { status: status === "all" ? undefined : status, classId: sp.class, subjectId: sp.subject, assignmentId: sp.assignment, q: sp.q }),
    listClasses(user),
    subjectsList(),
  ]);
  return (
    <>
      <PageHeader title="Topshirilgan ishlar" description="Tekshirishni kutayotgan va baholangan ishlar." />
      <FilterBar
        fields={[
          { name: "q", type: "search", placeholder: "O‘quvchi yoki vazifa" },
          { name: "status", label: "Holat", options: [["pending", "Tekshirilishi kerak"], ["graded", "Yakuniy baholangan"], ["returned", "Qaytarilgan"], ["all", "Barchasi"]] },
          { name: "class", label: "Guruh", options: [["", "Barcha guruhlar"], ...classes.map((c) => [c.id, c.name] as [string, string])] },
          { name: "subject", label: "Kategoriya", options: [["", "Barcha kategoriyalar"], ...subjects.map((s) => [s.id, s.name] as [string, string])] },
        ]}
      />
      {rows.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={`${r.assignmentId}:${r.studentId}`}>
                <Link href={`${base}/grade/${r.assignmentId}/${r.studentId}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2/60">
                  <Avatar name={r.studentName} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{r.studentName} <span className="font-normal text-muted">· {r.classNames}</span></span>
                    <span className="flex items-center gap-1.5 truncate text-[12.5px] text-muted">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: r.subjectColor }} />
                      <span className="truncate">{r.title}</span>
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-right text-[12px] text-muted sm:block">
                    {r.submittedAt ? formatDateTime(r.submittedAt) : ""}
                    {r.isLate ? <span className="block text-warning">kechikkan</span> : null}
                  </span>
                  <span className="w-28 shrink-0 text-right">
                    {r.gradeStatus === "final" ? (
                      <Badge tone="success" className="tabular">{fmtNumber(r.points!, 2)} / {fmtNumber(r.maxScore, 2)}</Badge>
                    ) : r.workStatus === "returned" ? (
                      <Badge tone="warning">Qaytarilgan</Badge>
                    ) : r.gradeStatus === "provisional" ? (
                      <Badge tone="violet">Dastlabki {fmtNumber(r.points!, 2)}</Badge>
                    ) : (
                      <Badge tone="info">Tekshirish</Badge>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={<Inbox />} title={status === "pending" ? "Tekshiriladigan ish yo‘q" : "Hech narsa topilmadi"} description={status === "pending" ? "Hammasi tekshirilgan. Yangi ishlar topshirilganda bildirishnoma olasiz." : undefined} />
        </Card>
      )}
    </>
  );
}

export async function GradePage({ user, base, assignmentId, studentId }: { user: SessionUser; base: string; assignmentId: string; studentId: string }) {
  const c = await orNotFound(gradingContext(user, assignmentId, studentId));
  const a = c.assignment;
  const quiz = isQuizType(a.type);
  const attempts = quiz ? await attemptsForGrading(user, assignmentId, studentId) : [];
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back={{ href: `${base}/submissions`, label: "Topshirilgan ishlar" }}
        eyebrow={<span>{c.subject?.name} · {t.assignmentType[a.type]}{a.dueAt ? ` · muddat ${formatDateTime(a.dueAt)}` : ""}</span>}
        title={a.title}
        actions={<LinkButton href={`${base}/students/${studentId}`} variant="secondary" size="sm">O‘quvchi kartasi</LinkButton>}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardBody className="flex items-center gap-3">
              <Avatar name={c.student.displayName} size={44} />
              <div>
                <div className="font-semibold">{c.student.displayName}</div>
                <div className="text-[12.5px] text-muted">@{c.student.username}{c.student.studentCode ? ` · ID ${c.student.studentCode}` : ""}</div>
              </div>
            </CardBody>
          </Card>

          {!quiz ? (
            c.submission && c.submission.version > 0 ? (
              <>
                <Card>
                  <CardHeader
                    title="Topshirilgan ish"
                    description={<>{c.submission.version}-versiya · {formatDateTime(c.submission.submittedAt!)}{c.submission.isLate ? " · kechikkan" : ""}</>}
                    action={c.submission.isLate ? <Badge tone="warning">Kechikkan</Badge> : <Badge tone="success">Muddatida</Badge>}
                  />
                  <CardBody className="space-y-3 pt-3">
                    {a.type === "homework" ? <HomeworkItemsList items={a.items} books={c.books} progress={c.versions[0]?.itemProgress ?? {}} bookHref={(id) => `${base}/library/${id}`} /> : null}
                    {c.versions[0]?.content ? <div className="rounded-xl bg-surface-2 p-4 text-[14.5px]"><RichText text={c.versions[0].content} /></div> : a.type === "homework" ? null : <p className="text-[13px] text-muted">Matn yo‘q.</p>}
                    {c.files.length ? <MediaGallery files={c.files} /> : null}
                  </CardBody>
                </Card>
                {c.versions.length > 1 ? (
                  <Card>
                    <CardHeader title="Oldingi versiyalar" icon={<History />} />
                    <CardBody className="space-y-2 pt-3">
                      {c.versions.slice(1).map((v) => (
                        <details key={v.id} className="rounded-xl border border-border px-4 py-2.5">
                          <summary className="cursor-pointer text-[13.5px] font-medium">{v.version}-versiya · {formatDateTime(v.submittedAt)}</summary>
                          <RichText text={v.content || "—"} className="mt-2 text-[13.5px] text-text-2" />
                        </details>
                      ))}
                    </CardBody>
                  </Card>
                ) : null}
              </>
            ) : (
              <Alert tone="info">O‘quvchi hali ishni topshirmagan.</Alert>
            )
          ) : attempts.length ? (
            attempts.map(({ attempt, items }) => (
              <Card key={attempt.id}>
                <CardHeader
                  title={`${attempt.attemptNo}-urinish`}
                  description={`${attempt.submittedAt ? formatDateTime(attempt.submittedAt) : "jarayonda"}${attempt.isLate ? " · kechikkan" : ""}`}
                  action={attempt.status === "in_progress" ? <Badge tone="warning">Jarayonda</Badge> : attempt.score != null ? <Badge tone="success" className="tabular">{fmtNumber(Number(attempt.score), 2)} / {fmtNumber(Number(attempt.maxScore), 2)}</Badge> : <Badge tone="violet">Qo‘lda baholash kerak</Badge>}
                />
                <CardBody className="pt-3">
                  {attempt.status === "in_progress" ? (
                    <p className="text-[13px] text-muted">Urinish yakunlanmagan.</p>
                  ) : (
                    <QuizGradeForm
                      attemptId={attempt.id}
                      items={items.map((i) => {
                        const ans = (i.response?.answer ?? null) as { optionId?: string; optionIds?: string[]; text?: string; blanks?: string[]; matches?: Record<string, string> } | null;
                        const cfg = i.question.config as QuestionConfig;
                        let answerText = "—";
                        if (ans?.optionId) answerText = i.question.options.find((o) => o.id === ans.optionId)?.label ?? "—";
                        else if (ans?.optionIds) answerText = ans.optionIds.map((id) => i.question.options.find((o) => o.id === id)?.label).filter(Boolean).join(", ") || "—";
                        else if (ans?.text != null) answerText = ans.text || "—";
                        else if (ans?.blanks) answerText = ans.blanks.join(" | ");
                        else if (ans?.matches) answerText = Object.entries(ans.matches).map(([l, r]) => `${cfg.pairs?.find((p) => p.id === l)?.left} → ${cfg.pairs?.find((p) => p.id === i.matchTokens[r])?.right ?? "?"}`).join("; ");
                        return {
                          questionId: i.question.id,
                          type: i.question.type,
                          prompt: i.question.prompt,
                          maxPoints: Number(i.question.points),
                          answerText,
                          correctText: i.question.options.filter((o) => o.isCorrect).map((o) => o.label).join(", ") || cfg.accepted?.map((x) => x.join(" / ")).join(" | ") || "",
                          isCorrect: i.response?.isCorrect ?? null,
                          points: i.response?.pointsAwarded ?? null,
                          manual: i.question.type === "essay" || (i.question.type === "short_answer" && !(cfg.accepted?.[0]?.length)),
                        };
                      })}
                    />
                  )}
                </CardBody>
              </Card>
            ))
          ) : (
            <Alert tone="info">O‘quvchi hali quizni boshlamagan.</Alert>
          )}

          {c.feedback.length ? (
            <Card>
              <CardHeader title="Izohlar tarixi" icon={<MessageSquareText />} />
              <CardBody className="space-y-2.5 pt-3">
                {c.feedback.map((f) => (
                  <div key={f.id} className={cn("rounded-xl p-3.5", f.kind === "revision_request" ? "bg-warning-soft" : "bg-surface-2")}>
                    <div className="mb-1 text-[12px] text-muted"><b className="text-text-2">{f.author}</b> · {formatDateTime(f.createdAt)}{f.kind === "revision_request" ? " · qayta ishlash so‘rovi" : ""}</div>
                    <RichText text={f.body} className="text-[13.5px]" />
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {!quiz && c.submission && c.submission.version > 0 ? (
            <GradeForm
              assignmentId={a.id}
              studentId={studentId}
              maxScore={Number(a.maxScore)}
              rubric={a.rubric}
              isLate={c.submission.isLate}
              latePenaltyPercent={a.latePenaltyPercent}
              current={c.grade ? { points: c.grade.points + c.grade.latePenaltyApplied, status: c.grade.status, rubricScores: c.grade.rubricScores } : null}
              canEditFinal={c.canEditFinal}
              returned={c.submission.status === "returned"}
            />
          ) : null}
          {quiz && c.grade ? (
            <Card>
              <CardHeader title="Rasmiy baho" />
              <CardBody className="space-y-3 pt-3">
                <div className="flex items-baseline gap-2 tabular">
                  <span className="text-[28px] font-semibold">{fmtNumber(c.grade.points, 2)}</span>
                  <span className="text-muted">/ {fmtNumber(c.grade.maxPoints, 2)} ({c.grade.scaleLabel})</span>
                </div>
                <Badge tone={c.grade.status === "final" ? "success" : "warning"}>{t.gradeStatus[c.grade.status]}</Badge>
                {c.grade.status === "provisional" ? <FinalizeButton gradeId={c.grade.id} /> : null}
              </CardBody>
            </Card>
          ) : null}
          {c.history.length ? (
            <Card>
              <CardHeader title="Baho o‘zgarishlari" icon={<History />} description="O‘chirib bo‘lmaydigan audit tarixi" />
              <CardBody className="pt-3">
                <ol className="space-y-3 text-[13px]">
                  {c.history.map((h) => (
                    <li key={h.id} className="border-l-2 border-border pl-3">
                      <div className="font-medium tabular">{h.oldPoints == null ? "—" : fmtNumber(h.oldPoints, 2)} → {fmtNumber(h.newPoints, 2)} · {t.gradeStatus[h.newStatus]}</div>
                      <div className="text-muted">{h.by} · {formatDateTime(h.changedAt)}</div>
                      {h.reason ? <div className="text-text-2">{h.reason}</div> : null}
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export async function GradebookPage({ user, base, sp }: { user: SessionUser; base: string; sp: { class?: string; subject?: string } }) {
  const [classes, subjects] = await Promise.all([listClasses(user), subjectsList()]);
  const classId = sp.class && classes.some((c) => c.id === sp.class) ? sp.class : classes[0]?.id;
  const gb = classId ? await gradebook(user, classId, sp.subject || undefined) : null;
  return (
    <>
      <PageHeader
        title="Baholar jurnali"
        description="Guruh bo‘yicha barcha baholar. * — dastlabki baho."
        actions={gb && can(user, "reports.export") ? <LinkButton href={`/api/export/gradebook?class=${classId}${sp.subject ? `&subject=${sp.subject}` : ""}`} variant="secondary" prefetch={false}><Download /> CSV eksport</LinkButton> : null}
      />
      <FilterBar
        fields={[
          { name: "class", label: "Guruh", options: classes.map((c) => [c.id, c.name] as [string, string]) },
          { name: "subject", label: "Kategoriya", options: [["", "Barcha kategoriyalar"], ...subjects.map((s) => [s.id, s.name] as [string, string])] },
        ]}
      />
      {!gb ? (
        <Card><EmptyState icon={<FileSpreadsheet />} title="Guruh yo‘q" description="Sizga hali guruh biriktirilmagan." /></Card>
      ) : !gb.assignments.length ? (
        <Card><EmptyState icon={<FileSpreadsheet />} title="Baholanadigan vazifalar yo‘q" description="Bu guruh uchun e’lon qilingan vazifalar baholangach, jurnal to‘ladi." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border bg-surface-2/60 text-[12px] text-muted">
                <tr>
                  <th className="sticky left-0 z-10 min-w-48 bg-surface-2 px-4 py-3 text-left font-medium">O‘quvchi</th>
                  {gb.assignments.map((a) => (
                    <th key={a.id} className="min-w-28 px-3 py-3 text-left font-medium">
                      <Link href={`${base}/assignments/${a.id}`} className="line-clamp-2 text-text-2 hover:text-primary" title={a.title}>{a.title}</Link>
                      <div className="font-normal">{a.dueAt ? formatDate(a.dueAt) : ""} · {a.maxScore}</div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">O‘rtacha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gb.rows.map((r) => (
                  <tr key={r.student.id} className="hover:bg-surface-2/40">
                    <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 font-medium">
                      <Link href={`${base}/students/${r.student.id}`} className="hover:text-primary">{r.student.name}</Link>
                      {r.student.status === "deactivated" ? <span className="ml-1 text-[11px] text-muted">(faol emas)</span> : null}
                    </td>
                    {r.cells.map((cell, i) => (
                      <td key={i} className="px-3 py-2.5 tabular">
                        {cell ? (
                          <Link href={`${base}/grade/${gb.assignments[i].id}/${r.student.id}`} className={cn("inline-flex min-w-12 items-center justify-center rounded-lg px-2 py-1 font-semibold", cell.percent >= 86 ? "bg-success-soft text-success" : cell.percent >= 56 ? "bg-surface-2 text-text" : "bg-danger-soft text-danger")}>
                            {fmtNumber(cell.points, 2)}{cell.status === "provisional" ? "*" : ""}
                          </Link>
                        ) : (
                          <Link href={`${base}/grade/${gb.assignments[i].id}/${r.student.id}`} className="text-muted hover:text-primary">—</Link>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right font-semibold tabular">{fmtPercent(r.average)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

export async function BankPage({ user, sp }: { user: SessionUser; sp: { subject?: string } }) {
  const [subjects, items] = await Promise.all([subjectsList(), listBank(user, sp.subject || undefined)]);
  return (
    <>
      <PageHeader title="Savollar banki" description="Qayta foydalaniladigan savollar. Quiz tahrirlovchisidan “Savollar bankidan” orqali qo‘shing." />
      <FilterBar fields={[{ name: "subject", label: "Kategoriya", options: [["", "Barcha kategoriyalar"], ...subjects.map((s) => [s.id, s.name] as [string, string])] }]} />
      <BankManager
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        defaultSubject={sp.subject || subjects[0]?.id || ""}
        items={items.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, points: Number(q.points), subjectName: q.subjectName, ownerName: q.ownerName, mine: q.ownerId === user.id, options: q.options.map((o) => ({ label: o.label, isCorrect: o.isCorrect })) }))}
        canDeleteAll={user.role !== "teacher"}
      />
    </>
  );
}

export async function StudentRecordPage({ user, base, studentId }: { user: SessionUser; base: string; studentId: string }) {
  const r = await orNotFound(studentRecord(user, studentId));
  const grades = r.grades;
  const avg = grades.length ? grades.reduce((s, g) => s + Number(g.percent), 0) / grades.length : null;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={{ href: base === "/admin" ? "/admin/students" : "/teacher/gradebook", label: base === "/admin" ? "O‘quvchilar" : "Baholar jurnali" }} title={r.user.displayName} description={`@${r.user.username}${r.user.studentCode ? ` · ID ${r.user.studentCode}` : ""} · ${r.classes.map((c) => c.name).join(", ") || "guruhsiz"}`} />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card><CardBody><div className="text-[12px] text-muted">O‘rtacha</div><div className="text-[22px] font-semibold tabular">{fmtPercent(avg == null ? null : Math.round(avg * 10) / 10)}</div></CardBody></Card>
        <Card><CardBody><div className="text-[12px] text-muted">Baholar</div><div className="text-[22px] font-semibold tabular">{grades.length}</div></CardBody></Card>
        <Card><CardBody><div className="text-[12px] text-muted">Oxirgi kirish</div><div className="text-[15px] font-semibold">{r.user.lastLoginAt ? formatDateTime(r.user.lastLoginAt) : "—"}</div></CardBody></Card>
      </div>
      <Card className="overflow-hidden">
        <CardHeader title="Baholar" icon={<ClipboardCheck />} description={base === "/teacher" ? "Faqat sizning guruhlaringiz" : undefined} />
        <CardBody className="pt-3">
          {grades.length ? (
            <ul className="-mx-2 divide-y divide-border">
              {grades.map((g) => (
                <li key={g.assignment_id}>
                  <Link href={`${base}/grade/${g.assignment_id}/${studentId}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
                    <span className="grid size-9 place-items-center rounded-lg bg-primary-soft font-bold text-primary-soft-fg">{g.scale_label}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{g.title}</span><span className="text-[12px] text-muted">{g.subject} · {formatDate(g.graded_at)}</span></span>
                    <span className="text-[13.5px] font-semibold tabular">{fmtNumber(Number(g.points), 2)} / {fmtNumber(Number(g.max_points), 2)}</span>
                    <Badge tone={g.status === "final" ? "success" : "warning"}>{t.gradeStatus[g.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-[13.5px] text-muted">Baholar yo‘q.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
