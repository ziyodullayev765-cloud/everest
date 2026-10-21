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

type Props = {
  assignmentId: string;
  type: "written" | "file_upload";
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
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<{ submittedAt: string; version: number; isLate: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, start] = useTransition();
  const online = useOnline();
  const latest = useRef({ content, files });
  latest.current = { content, files };

  const save = useCallback(
    async (manual = false) => {
      if (!p.draftAllowed) return;
      setSaving(true);
      const r = await saveDraftAction(p.assignmentId, { content: latest.current.content, fileIds: latest.current.files.map((f) => f.id) });
      setSaving(false);
      if (r.ok) {
        setSavedAt(r.data.savedAt);
        setDirty(false);
        if (manual) toast.success("Qoralama saqlandi");
      } else if (manual) toast.error(r.error);
    },
    [p.assignmentId, p.draftAllowed],
  );

  // Autosave the draft 2.5 s after the last change (only while online).
  useEffect(() => {
    if (!dirty || !online || !p.draftAllowed) return;
    const t = setTimeout(() => save(false), 2500);
    return () => clearTimeout(t);
  }, [dirty, content, files, online, save, p.draftAllowed]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty && !done) e.preventDefault();
    };
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, [dirty, done]);

  const canSubmit = p.type === "file_upload" ? files.length > 0 : content.trim().length > 0 || files.length > 0;

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await submitWorkAction(p.assignmentId, { content, fileIds: files.map((f) => f.id) });
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
          <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Ishingiz topshirildi</h2>
          <p className="mt-1.5 text-[14px] text-muted">
            {formatDateTime(done.submittedAt)} da qabul qilindi{done.version > 1 ? ` (${done.version}-topshiriq)` : ""}.{done.isLate ? " Muddatdan kechikib topshirildi." : ""}
          </p>
          <p className="mt-1 text-[13px] text-muted">O‘qituvchi tekshirgach, baho va izohlar shu vazifa sahifasida ko‘rinadi.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href={`/assignments/${p.assignmentId}`} className="inline-flex h-10 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2">
              Vazifani ko‘rish
            </Link>
            <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-fg hover:bg-primary-hover">
              Bosh sahifa
            </Link>
          </div>
        </CardBody>
      </Card>
    );

  return (
    <div className="space-y-4">
      {p.late ? (
        <Alert tone="warning" title="Muddat o‘tgan">
          Ish kechikkan deb belgilanadi{p.latePenaltyPercent ? ` va bahodan ${p.latePenaltyPercent}% ayriladi` : ""}.
        </Alert>
      ) : null}
      {p.isResubmission ? <Alert tone="info">Bu qayta topshirish bo‘ladi. Oldingi versiya o‘qituvchi uchun saqlanib qoladi.</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {p.instructions ? (
        <details className="rounded-2xl border border-border bg-surface px-5 py-3.5 shadow-soft">
          <summary className="cursor-pointer text-[14px] font-medium">Ko‘rsatmalarni ko‘rish</summary>
          <RichText text={p.instructions} className="mt-3 text-[14px] text-text-2" />
        </details>
      ) : null}

      <Card>
        <CardBody className="space-y-5">
          <Field label={p.type === "file_upload" ? "Izoh (ixtiyoriy)" : "Javobingiz"} htmlFor="content" hint="Formulalar uchun $…$ dan foydalanishingiz mumkin, masalan $x^2+1$">
            <Textarea
              id="content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
              }}
              rows={p.type === "file_upload" ? 4 : 12}
              maxLength={50000}
              placeholder={p.type === "file_upload" ? "O‘qituvchi uchun qisqa izoh…" : "Javobingizni shu yerga yozing…"}
            />
          </Field>
          <Field label={p.type === "file_upload" ? "Fayllar" : "Fayllar (ixtiyoriy)"} required={p.type === "file_upload"}>
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

      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-pop backdrop-blur lg:bottom-4">
        <div className="flex min-w-0 items-center gap-2 pl-1 text-[12.5px] text-muted" aria-live="polite">
          {!online ? (
            <>
              <CloudOff className="size-4 text-warning" aria-hidden /> Oflayn — aloqa tiklanganda saqlang
            </>
          ) : saving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Saqlanmoqda…
            </>
          ) : savedAt && !dirty ? (
            <>
              <CheckCircle2 className="size-4 text-success" aria-hidden /> Qoralama saqlandi
            </>
          ) : dirty ? (
            "Saqlanmagan o‘zgarishlar"
          ) : (
            <span className="truncate">{p.dueAt ? `Muddat: ${formatDateTime(p.dueAt)}` : ""}</span>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {p.draftAllowed ? (
            <Button variant="secondary" onClick={() => save(true)} disabled={!online || saving}>
              <Save /> <span className="hidden sm:inline">Qoralama</span>
            </Button>
          ) : null}
          <Button onClick={() => setConfirm(true)} disabled={!canSubmit || !online}>
            <Send /> Topshirish
          </Button>
        </div>
      </div>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Ishni topshirasizmi?"
        description={p.isResubmission ? "Yangi versiya yuboriladi." : "Topshirilgandan so‘ng ishni o‘zgartirib bo‘lmaydi (agar qayta topshirishga ruxsat berilmagan bo‘lsa)."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Bekor qilish
            </Button>
            <Button onClick={submit} loading={submitting}>
              Ha, topshirish
            </Button>
          </>
        }
      >
        <ul className="space-y-1.5 rounded-xl bg-surface-2 p-4 text-[13.5px] text-text-2">
          <li>Javob matni: {content.trim() ? `${content.trim().length} belgi` : "yo‘q"}</li>
          <li>Biriktirilgan fayllar: {files.length} ta</li>
          {p.late ? <li className="text-warning">Kechikib topshirilmoqda</li> : null}
        </ul>
      </Dialog>
    </div>
  );
}
