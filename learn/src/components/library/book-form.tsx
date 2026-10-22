"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, FileText, ImagePlus, Loader2, Music, Save, Trash2, Upload } from "lucide-react";
import { saveBookAction } from "@/app/actions/admin";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";
import { fmtSize, uploadFile, type UploadedFile } from "@/components/app/uploader";
import { t } from "@/lib/i18n";

type Track = { title: string; file: Pick<UploadedFile, "id" | "name" | "size"> };
export type BookFormValue = {
  title: string;
  author: string;
  level: string;
  category: string;
  description: string;
  status: "draft" | "published" | "archived";
  cover: Pick<UploadedFile, "id" | "name"> | null;
  pdf: Pick<UploadedFile, "id" | "name" | "size"> | null;
  audio: Track[];
};

const CATS = ["reading", "listening", "vocabulary", "grammar", "speaking", "writing", "other"] as const;
const stripExt = (n: string) => n.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();

function useUpload() {
  const [state, setState] = useState<{ label: string; pct: number | null } | null>(null);
  const run = async (f: File, label: string, opts: { imagesOnly?: boolean } = {}) => {
    setState({ label, pct: 0 });
    try {
      return await uploadFile(f, { ...opts, onProgress: (pct) => setState({ label, pct }) });
    } catch (e) {
      toast.error(`${f.name}: ${(e as Error).message}`);
      return null;
    } finally {
      setState(null);
    }
  };
  return { state, run };
}

export function BookForm({ id, base, initial }: { id: string | null; base: string; initial: BookFormValue }) {
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const up = useUpload();
  const router = useRouter();
  const set = <K extends keyof BookFormValue>(k: K, val: BookFormValue[K]) => setV((x) => ({ ...x, [k]: val }));

  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveBookAction(id, {
        title: v.title,
        author: v.author,
        level: v.level,
        category: v.category,
        description: v.description,
        status: v.status,
        coverFileId: v.cover?.id ?? null,
        pdfFileId: v.pdf?.id ?? null,
        audio: v.audio.map((a) => ({ title: a.title, fileId: a.file.id })),
      });
      if (!r.ok) return setError(r.error);
      toast.success("Kitob saqlandi");
      router.push(`${base}/library/${r.data}`);
    });

  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {up.state ? (
        <Alert tone="info">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden /> {up.state.label} yuklanmoqda{up.state.pct != null ? ` — ${up.state.pct}%` : "…"}
          </span>
        </Alert>
      ) : null}
      <Card>
        <CardHeader title="Kitob haqida" />
        <CardBody className="grid gap-5 sm:grid-cols-[160px_1fr]">
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-text-2">Muqova</div>
            <label className="group relative block cursor-pointer">
              {v.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${v.cover.id}`} alt="" className="aspect-[3/4] w-full rounded-xl border border-border object-cover" />
              ) : (
                <span className="grid aspect-[3/4] w-full place-items-center rounded-xl border border-dashed border-border-strong bg-surface-2 text-center text-[12.5px] text-muted group-hover:border-primary group-hover:text-primary">
                  <span>
                    <ImagePlus className="mx-auto mb-1 size-6" aria-hidden />
                    Rasm yuklash
                  </span>
                </span>
              )}
              <input
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  const r = await up.run(f, "Muqova", { imagesOnly: true });
                  if (r) set("cover", r);
                }}
              />
            </label>
            {v.cover ? (
              <button type="button" onClick={() => set("cover", null)} className="mt-1.5 text-[12.5px] text-muted hover:text-danger">
                Olib tashlash
              </button>
            ) : null}
          </div>
          <div className="space-y-4">
            <Field label="Nomi" htmlFor="bk-title" required>
              <Input id="bk-title" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Barron's Reading" maxLength={200} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Muallif" htmlFor="bk-author">
                <Input id="bk-author" value={v.author} onChange={(e) => set("author", e.target.value)} maxLength={200} />
              </Field>
              <Field label="Daraja" htmlFor="bk-level">
                <Input id="bk-level" value={v.level} onChange={(e) => set("level", e.target.value)} placeholder="B2, Intermediate…" maxLength={40} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Turkum" htmlFor="bk-cat">
                <Select id="bk-cat" value={v.category} onChange={(e) => set("category", e.target.value)}>
                  {CATS.map((c) => (
                    <option key={c} value={c}>
                      {t.bookCategory[c]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Holat" htmlFor="bk-status">
                <Select id="bk-status" value={v.status} onChange={(e) => set("status", e.target.value as BookFormValue["status"])}>
                  <option value="published">E’lon qilingan (hamma ko‘radi)</option>
                  <option value="draft">Qoralama (faqat admin)</option>
                  <option value="archived">Arxiv</option>
                </Select>
              </Field>
            </div>
            <Field label="Tavsif" htmlFor="bk-desc">
              <Textarea id="bk-desc" value={v.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={5000} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Kitob fayli (PDF)" icon={<FileText />} />
        <CardBody>
          {v.pdf ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <a href={`/api/files/${v.pdf.id}`} target="_blank" rel="noopener" className="min-w-0 truncate text-[14px] font-semibold hover:text-primary">
                {v.pdf.name} <span className="font-normal text-muted">· {fmtSize(v.pdf.size)}</span>
              </a>
              <Button variant="ghost" size="sm" onClick={() => set("pdf", null)}>
                <Trash2 /> Olib tashlash
              </Button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2/50 px-4 py-5 text-[13.5px] font-semibold text-text-2 hover:border-primary hover:text-primary">
              <Upload className="size-4" aria-hidden /> PDF yuklash
              <input
                type="file"
                hidden
                accept="application/pdf,.pdf"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  const r = await up.run(f, "PDF");
                  if (r) {
                    if (r.mime !== "application/pdf") toast.error("Bu PDF fayl emas.");
                    else set("pdf", r);
                  }
                }}
              />
            </label>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Audio treklar" icon={<Music />} description="Listening kitoblari uchun CD treklari. Bir nechtasini birdaniga tanlash mumkin." />
        <CardBody className="space-y-2">
          {v.audio.map((a, i) => (
            <div key={a.file.id} className="flex items-center gap-2 rounded-xl border border-border p-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-[12px] font-bold tabular">{i + 1}</span>
              <Input value={a.title} onChange={(e) => set("audio", v.audio.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} aria-label="Trek nomi" className="h-9" />
              <span className="hidden shrink-0 text-[11.5px] text-muted sm:inline">{fmtSize(a.file.size)}</span>
              <Button variant="ghost" size="icon" className="size-8" disabled={i === 0} onClick={() => { const n = [...v.audio]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; set("audio", n); }} aria-label="Yuqoriga"><ArrowUp /></Button>
              <Button variant="ghost" size="icon" className="size-8" disabled={i === v.audio.length - 1} onClick={() => { const n = [...v.audio]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; set("audio", n); }} aria-label="Pastga"><ArrowDown /></Button>
              <Button variant="ghost" size="icon" className="size-8 hover:text-danger" onClick={() => set("audio", v.audio.filter((_, j) => j !== i))} aria-label="O‘chirish"><Trash2 /></Button>
            </div>
          ))}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2/50 px-4 py-4 text-[13.5px] font-semibold text-text-2 hover:border-primary hover:text-primary">
            <Upload className="size-4" aria-hidden /> Audio qo‘shish (MP3, M4A, WAV, OGG)
            <input
              type="file"
              hidden
              multiple
              accept="audio/*,.mp3,.m4a,.wav,.ogg"
              onChange={async (e) => {
                const list = [...(e.target.files ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
                e.target.value = "";
                for (const [n, f] of list.entries()) {
                  const r = await up.run(f, `Audio ${n + 1}/${list.length}`);
                  if (r) {
                    if (!r.mime.startsWith("audio/")) toast.error(`${f.name}: audio fayl emas.`);
                    else setV((x) => ({ ...x, audio: [...x.audio, { title: stripExt(f.name), file: r }] }));
                  }
                }
              }}
            />
          </label>
        </CardBody>
      </Card>

      <div className="sticky bottom-4 z-10 flex justify-end rounded-3xl border-2 border-border bg-surface/95 p-3 shadow-pop backdrop-blur">
        <Button onClick={save} loading={pending} disabled={!!up.state || v.title.trim().length < 2}>
          <Save /> Saqlash
        </Button>
      </div>
    </div>
  );
}
