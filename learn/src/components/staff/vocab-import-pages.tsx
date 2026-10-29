import Link from "next/link";
import { Download, FileSpreadsheet, History, Upload } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { isAdmin } from "@/server/auth/rbac";
import { listClasses } from "@/server/services/classes";
import { listWordLists } from "@/server/services/vocabulary";
import { getImport, listImports } from "@/server/services/vocab-import";
import { orNotFound } from "@/server/auth/guards";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Alert } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { ImportWizard } from "./vocab-import";
import { RevertImportButton } from "./vocab-import-actions";
import { tr } from "@/lib/i18n/tr";

const JOB_STATUS: Record<string, { label: string; tone: "success" | "danger" | "neutral" }> = {
  done: { get label() { return tr("Bajarildi"); }, tone: "success" },
  failed: { get label() { return tr("Muvaffaqiyatsiz"); }, tone: "danger" },
  reverted: { get label() { return tr("Bekor qilingan"); }, tone: "neutral" },
};

export async function ImportPage({ user, base, listId }: { user: SessionUser; base: string; listId?: string }) {
  const [lists, classes] = await Promise.all([listWordLists(user), listClasses(user)]);
  const editable = lists.filter((l) => l.status !== "archived" && (isAdmin(user) || l.createdBy === user.id));
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: `${base}/vocabulary`, label: tr("Lug‘at ro‘yxatlari") }}
        title={tr("Lug‘at importi")}
        description={tr("Fayldan so‘zlarni yuklang: avval tekshiriladi, keyin siz tasdiqlaysiz.")}
        actions={<LinkButton href={`${base}/vocabulary/imports`} variant="secondary"><History /> {tr("Import tarixi")}</LinkButton>}
      />
      <ImportWizard
        base={base}
        lists={editable.map((l) => ({ id: l.id, title: l.title, status: l.status, words: l.words }))}
        classes={classes.map((c) => ({ id: c.id, name: c.name, students: c.students }))}
        initialListId={editable.some((l) => l.id === listId) ? listId : undefined}
      />
    </div>
  );
}

export async function ImportsPage({ user, base, sp }: { user: SessionUser; base: string; sp: { status?: string } }) {
  const rows = await listImports(user, { status: sp.status || undefined });
  return (
    <>
      <PageHeader
        back={{ href: `${base}/vocabulary`, label: tr("Lug‘at ro‘yxatlari") }}
        title={tr("Import tarixi")}
        description={isAdmin(user) ? tr("Barcha importlar: kim, qachon, qaysi ro‘yxatga va natijasi.") : tr("Siz qilgan importlar.")}
        actions={<LinkButton href={`${base}/vocabulary/import`}><Upload /> {tr("Yangi import")}</LinkButton>}
      />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label={tr("Holat")}>
        {[["", tr("Hammasi")], ["done", JOB_STATUS.done.label], ["failed", JOB_STATUS.failed.label], ["reverted", JOB_STATUS.reverted.label]].map(([k, l]) => (
          <Link key={k} href={`${base}/vocabulary/imports${k ? `?status=${k}` : ""}`} aria-current={(sp.status ?? "") === k ? "page" : undefined} className="rounded-full border-2 border-border bg-surface px-3 py-1 text-[13px] font-bold text-text-2 aria-[current=page]:border-primary aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary">
            {l}
          </Link>
        ))}
      </nav>
      {rows.length ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto" data-no-pull>
            <table className="w-full min-w-[720px] text-[13.5px]">
              <thead className="bg-surface-2 text-left text-[12px] text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">{tr("Vaqt")}</th>
                  <th className="px-3 py-2.5 font-semibold">{tr("Ro‘yxat")}</th>
                  <th className="px-3 py-2.5 font-semibold">{tr("Fayl")}</th>
                  <th className="px-3 py-2.5 font-semibold">{tr("Natija")}</th>
                  <th className="px-3 py-2.5 font-semibold">{tr("Holat")}</th>
                  <th className="px-3 py-2.5 font-semibold">{tr("Kim")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((j) => (
                  <tr key={j.id} className="hover:bg-surface-2/50">
                    <td className="px-4 py-2.5 whitespace-nowrap"><Link prefetch={false} className="font-semibold text-primary hover:underline" href={`${base}/vocabulary/imports/${j.id}`}>{formatDateTime(j.createdAt)}</Link></td>
                    <td className="px-3 py-2.5"><Link prefetch={false} className="hover:text-primary" href={`${base}/vocabulary/${j.listId}`}>{j.listTitle}</Link></td>
                    <td className="max-w-48 truncate px-3 py-2.5 text-text-2" title={j.fileName}>{j.fileName} <span className="text-muted">· {j.format.toUpperCase()}</span></td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular">+{j.added}{j.updated ? ` · ↻${j.updated}` : ""}{j.skipped ? ` · ${tr("{0} o‘tkazildi", j.skipped)}` : ""}{j.failed ? <span className="text-danger"> · {tr("{0} xato", j.failed)}</span> : null}</td>
                    <td className="px-3 py-2.5"><Badge tone={JOB_STATUS[j.status]?.tone}>{JOB_STATUS[j.status]?.label}</Badge></td>
                    <td className="px-3 py-2.5 text-text-2">{j.author}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card><EmptyState icon={<FileSpreadsheet />} title={tr("Hali import yo‘q")} description={tr("CSV, Excel, JSON yoki TXT fayldan so‘zlarni yuklang.")} action={<LinkButton href={`${base}/vocabulary/import`}><Upload /> {tr("Yangi import")}</LinkButton>} /></Card>
      )}
    </>
  );
}

export async function ImportDetailPage({ user, base, id }: { user: SessionUser; base: string; id: string }) {
  const { job, listTitle, author, groups } = await orNotFound(getImport(user, id));
  const errors = job.errors.filter((e) => e.kind !== "skipped");
  const skipped = job.errors.filter((e) => e.kind === "skipped");
  const stat = (n: number, label: string, cls: string) => (
    <div className={`rounded-2xl px-4 py-3 ${cls}`}><div className="text-[24px] leading-tight font-black tabular">{n}</div><div className="text-[12.5px] font-semibold">{label}</div></div>
  );
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={{ href: `${base}/vocabulary/imports`, label: tr("Import tarixi") }}
        eyebrow={<Badge tone={JOB_STATUS[job.status]?.tone}>{JOB_STATUS[job.status]?.label}</Badge>}
        title={tr("Import: {0}", listTitle)}
        description={`${job.fileName} · ${job.format.toUpperCase()} · ${formatDateTime(job.createdAt)} · ${author}`}
        actions={
          <>
            <LinkButton href={`${base}/vocabulary/${job.listId}`} variant="secondary">{tr("Ro‘yxatni ochish")}</LinkButton>
            {job.status === "done" ? <RevertImportButton id={job.id} /> : null}
          </>
        }
      />
      {job.status === "failed" ? <Alert tone="danger" title={tr("Import bajarilmadi — hech narsa yozilmadi")} className="mb-5">{errors[0]?.message}</Alert> : null}
      {job.status === "reverted" ? <Alert tone="info" className="mb-5">{tr("Bu import {0} da bekor qilingan: qo‘shilgan so‘zlar olib tashlangan, o‘zgartirilganlari tiklangan.", job.revertedAt ? formatDateTime(job.revertedAt) : "")}</Alert> : null}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stat(job.total, tr("qator"), "bg-surface-2 text-text")}
        {stat(job.added, tr("qo‘shildi"), "bg-success-soft text-success")}
        {stat(job.updated, tr("yangilandi"), "bg-warning-soft text-warning")}
        {stat(job.skipped, tr("o‘tkazildi"), "bg-surface-2 text-text-2")}
        {stat(job.failed, tr("xato"), "bg-danger-soft text-danger")}
      </div>
      <Card className="mb-5">
        <CardBody className="space-y-1 text-[13.5px]">
          <p><b>{tr("Takrorlar")}:</b> {job.policy === "update" ? tr("yangilandi") : tr("o‘tkazib yuborildi")}</p>
          <p><b>{tr("Guruhlar")}:</b> {groups.length ? groups.map((g) => g.name).join(", ") : tr("bu importda biriktirilmagan")}</p>
        </CardBody>
      </Card>
      {job.errors.length ? (
        <Card className="overflow-hidden">
          <CardHeader
            title={tr("Yozilmagan qatorlar")}
            description={tr("{0} xato, {1} o‘tkazilgan", errors.length, skipped.length)}
            action={<a href={`/api/vocab/imports/${job.id}/report`} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-primary hover:underline"><Download className="size-4" /> {tr("CSV hisobot")}</a>}
          />
          <div className="max-h-[480px] overflow-auto" data-no-pull>
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-surface-2 text-left text-[12px] text-muted">
                <tr><th className="px-4 py-2">{tr("Qator")}</th><th className="px-3 py-2">{tr("So‘z")}</th><th className="px-3 py-2">{tr("Sabab")}</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...errors, ...skipped].map((e, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-muted tabular">{e.line || "—"}</td>
                    <td className="px-3 py-2 font-semibold">{e.value || "—"}</td>
                    <td className={e.kind === "skipped" ? "px-3 py-2 text-text-2" : "px-3 py-2 text-danger"}>{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : job.status === "done" ? (
        <Alert tone="success">{tr("Hamma qatorlar muvaffaqiyatli yozildi.")}</Alert>
      ) : null}
    </div>
  );
}
