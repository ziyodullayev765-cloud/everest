"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, CloudOff, Loader2, Save, Send } from "lucide-react";
import { saveDraftAction, submitWorkAction } from "@/app/actions/student";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { RichText } from "@/components/ui/rich-text";
import { Uploader, type UploadedFile } from "@/components/app/uploader";
import { useOnline } from "@/components/app/pwa";
import { formatDateTime } from "@/lib/dates";
import type { HomeworkItem } from "@/server/db/schema";
import { KIND_ICON, KIND_TONE } from "@/components/app/homework-items";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { tr } from "@/lib/i18n/tr";

type Progress = Record<string, { done: boolean; text?: string }>;
const TEXT_KINDS = new Set(["translation", "tapescript", "writing"]);

type Props = {
  assignmentId: string;
  type: "written" | "file_upload" | "homework";
  items: HomeworkItem[];
  books: { id: string; title: string }[];
  initialProgress: Progress;
  dueAt: string | null;
  late: boolean;
  latePenaltyPercent: number;
  isResubmission: boolean;
  draftAllowed: boolean;
  initialContent: string;
  initialFiles: UploadedFile[];
  instructions: string;
};

export function SubmitEditor(p: Props) {
  const [content, setContent] = useState(p.initialContent);
  const [files, setFiles] = useState<UploadedFile[]>(p.initialFiles);
  const [progress, setProgress] = useState<Progress>(p.initialProgress);
  const hw = p.type === "homework";
  const doneCount = p.items.filter((i) => progress[i.id]?.done).length;
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<{ submittedAt: string; version: number; isLate: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, start] = useTransition();
  const online = useOnline();
  const latest = useRef({ content, files, progress });
  latest.current = { content, files, progress };

  const save = useCallback(
    async (manual = false) => {
      if (!p.draftAllowed) return;
      setSaving(true);
      const r = await saveDraftAction(p.assignmentId, { content: latest.current.content, fileIds: latest.current.files.map((f) => f.id), itemProgress: latest.current.progress });
      setSaving(false);
      if (r.ok) {
        setSavedAt(r.data.savedAt);
        setDirty(false);
        if (manual) toast.success(tr("Qoralama saqlandi"));
      } else if (manual) toast.error(r.error);
    },
    [p.assignmentId, p.draftAllowed],
  );

  // Autosave the draft 2.5 s after the last change (only while online).
  useEffect(() => {
    if (!dirty || !online || !p.draftAllowed) return;
    const t = setTimeout(() => save(false), 2500);
    return () => clearTimeout(t);
  }, [dirty, content, files, progress, online, save, p.draftAllowed]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty && !done) e.preventDefault();
    };
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, [dirty, done]);

  const canSubmit = hw ? doneCount > 0 : p.type === "file_upload" ? files.length > 0 : content.trim().length > 0 || files.length > 0;

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await submitWorkAction(p.assignmentId, { content, fileIds: files.map((f) => f.id), itemProgress: progress });
      setConfirm(false);
      if (r.ok) {
        setDone(r.data);
        setDirty(false);
      } else setError(r.error);
    });

  if (done)
    return (
      <Card className="animate-fade-up">
        <CardBody className="flex flex-col items-center px-6 py-10 text-center">
          <div className="mb-4 grid size-16 place-items-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="size-8" aria-hidden />
          </div>
          <h2 className="text-[20px] font-bold tracking-[-0.01em]">{tr("Ishingiz topshirildi")}</h2>
          <p className="mt-1.5 text-[14px] text-muted">
            {tr("{0} da qabul qilindi", formatDateTime(done.submittedAt))}{done.version > 1 ? ` (${done.version}-topshiriq)` : ""}.{done.isLate ? tr(" Muddatdan kechikib topshirildi.") : ""}
          </p>
          <p className="mt-1 text-[13px] text-muted">{tr("O‘qituvchi tekshirgach, baho va izohlar shu vazifa sahifasida ko‘rinadi.")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href={`/assignments/${p.assignmentId}`} className="inline-flex h-10 items-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-2">
              {tr("Vazifani ko‘rish")}
            </Link>
            <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-hover">
              {tr("Bosh sahifa")}
            </Link>
          </div>
        </CardBody>
      </Card>
    );

  return (
    <div className="space-y-4">
      {p.late ? (
        <Alert tone="warning" title={tr("Muddat o‘tgan")}>
          {tr("Ish kechikkan deb belgilanadi")}{p.latePenaltyPercent ? tr(" va bahodan {0}% ayriladi", p.latePenaltyPercent) : ""}.
        </Alert>
      ) : null}
      {p.isResubmission ? <Alert tone="info">{tr("Bu qayta topshirish bo‘ladi. Oldingi versiya o‘qituvchi uchun saqlanib qoladi.")}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {p.instructions ? (
        <details className="rounded-3xl border-2 border-border bg-surface px-5 py-3.5 shadow-soft">
          <summary className="cursor-pointer text-[14px] font-semibold">{tr("Ko‘rsatmalarni ko‘rish")}</summary>
          <RichText text={p.instructions} className="mt-3 text-[14px] text-text-2" />
        </details>
      ) : null}

      {hw ? (
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold">{tr("Topshiriqlar")}</h2>
              <span className="text-[13px] text-muted tabular">
                {tr("{0} / {1} bajarildi", doneCount, p.items.length)}
              </span>
            </div>
            {p.items.map((it, n) => {
              const Icon = KIND_ICON[it.kind];
              const cur = progress[it.id] ?? { done: false };
              const book = it.bookId ? p.books.find((b) => b.id === it.bookId) : null;
              const setItem = (patch: Partial<{ done: boolean; text: string }>) => {
                setProgress((x) => ({ ...x, [it.id]: { ...cur, ...patch } }));
                setDirty(true);
              };
              return (
                <div key={it.id} className={cn("rounded-xl border p-3.5 transition", cur.done ? "border-success/40 bg-success-soft/40" : "border-border")}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={cur.done} onChange={(e) => setItem({ done: e.target.checked })} className="mt-1 size-5 shrink-0 accent-[var(--primary)]" aria-label={tr("{0} — bajarildi", it.title)} />
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", KIND_TONE[it.kind])}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold text-muted">
                        {n + 1}. {t.homeworkKind[it.kind]}
                      </span>
                      <span className="block text-[14.5px] font-bold">{it.title}</span>
                      <span className="flex flex-wrap gap-x-3 text-[12.5px] text-muted">
                        {it.range ? <span>{it.range}</span> : null}
                        {book ? (
                          <a href={`/library/${book.id}`} target="_blank" rel="noopener" className="font-semibold text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                            {book.title}
                          </a>
                        ) : null}
                      </span>
                      {it.note ? <span className="mt-1 block text-[13px] text-text-2">{it.note}</span> : null}
                    </span>
                  </label>
                  {TEXT_KINDS.has(it.kind) ? (
                    <Textarea
                      value={cur.text ?? ""}
                      onChange={(e) => setItem({ text: e.target.value, done: cur.done || e.target.value.trim().length > 0 })}
                      rows={5}
                      maxLength={20000}
                      className="mt-3"
                      placeholder={it.kind === "tapescript" ? tr("Eshitganingizni shu yerga yozing…") : it.kind === "translation" ? tr("Tarjimangizni shu yerga yozing…") : tr("Matningizni yozing…")}
                      aria-label={tr("{0} — matn", it.title)}
                    />
                  ) : null}
                </div>
              );
            })}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="space-y-5">
          <Field label={hw || p.type === "file_upload" ? tr("Izoh (ixtiyoriy)") : tr("Javobingiz")} htmlFor="content" hint={tr("Formulalar uchun $…$ dan foydalanishingiz mumkin, masalan $x^2+1$")}>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
              }}
              rows={hw || p.type === "file_upload" ? 3 : 12}
              maxLength={50000}
              placeholder={p.type === "file_upload" ? tr("O‘qituvchi uchun qisqa izoh…") : tr("Javobingizni shu yerga yozing…")}
            />
          </Field>
          <Field label={p.type === "file_upload" ? tr("Fayllar") : hw ? tr("Daftar rasmi yoki audio (ixtiyoriy)") : tr("Fayllar (ixtiyoriy)")} required={p.type === "file_upload"}>
            <Uploader
              files={files}
              onChange={(f) => {
                setFiles(f);
                setDirty(true);
              }}
            />
          </Field>
        </CardBody>
      </Card>

      <div className="sticky bottom-[calc(96px+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-3 rounded-3xl border-2 border-border bg-surface/95 p-3 shadow-pop backdrop-blur lg:bottom-4">
        <div className="flex min-w-0 items-center gap-2 pl-1 text-[12.5px] text-muted" aria-live="polite">
          {!online ? (
            <>
              <CloudOff className="size-4 text-warning" aria-hidden /> {tr("Oflayn — aloqa tiklanganda saqlang")}
            </>
          ) : saving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> {tr("Saqlanmoqda…")}
            </>
          ) : savedAt && !dirty ? (
            <>
              <CheckCircle2 className="size-4 text-success" aria-hidden /> {tr("Qoralama saqlandi")}
            </>
          ) : dirty ? (
            tr("Saqlanmagan o‘zgarishlar")
          ) : (
            <span className="truncate">{p.dueAt ? `Muddat: ${formatDateTime(p.dueAt)}` : ""}</span>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {p.draftAllowed ? (
            <Button variant="secondary" onClick={() => save(true)} disabled={!online || saving}>
              <Save /> <span className="hidden sm:inline">{tr("Qoralama")}</span>
            </Button>
          ) : null}
          <Button onClick={() => setConfirm(true)} disabled={!canSubmit || !online}>
            <Send /> {tr("Topshirish")}
          </Button>
        </div>
      </div>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={tr("Ishni topshirasizmi?")}
        description={p.isResubmission ? tr("Yangi versiya yuboriladi.") : tr("Topshirilgandan so‘ng ishni o‘zgartirib bo‘lmaydi (agar qayta topshirishga ruxsat berilmagan bo‘lsa).")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              {tr("Bekor qilish")}
            </Button>
            <Button onClick={submit} loading={submitting}>
              {tr("Ha, topshirish")}
            </Button>
          </>
        }
      >
        <ul className="space-y-1.5 rounded-xl bg-surface-2 p-4 text-[13.5px] text-text-2">
          {hw ? (
            <li className={doneCount < p.items.length ? "text-warning" : undefined}>
              {tr("Bajarilgan topshiriqlar: {0} / {1}", doneCount, p.items.length)}
            </li>
          ) : (
            <li>{tr("Javob matni:")} {content.trim() ? `${content.trim().length} belgi` : tr("yo‘q")}</li>
          )}
          <li>{tr("Biriktirilgan fayllar: {0} ta", files.length)}</li>
          {p.late ? <li className="text-warning">{tr("Kechikib topshirilmoqda")}</li> : null}
        </ul>
      </Dialog>
    </div>
  );
}
