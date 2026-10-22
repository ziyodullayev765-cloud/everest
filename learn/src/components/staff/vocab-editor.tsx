"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Download, FileUp, ImagePlus, Music, Pencil, Plus, RotateCcw, Save, Search, Send, Trash2, Users, X } from "lucide-react";
import { importWordsAction, removeWordAction, saveWordAction, saveWordListAction, wordListStatusAction, wordListTargetsAction } from "@/app/actions/vocab";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { uploadFile } from "@/components/app/uploader";
import { LEVELS } from "@/lib/course";
import { parseWordCsv, WORD_CSV_HEADER } from "@/lib/word-csv";

type Word = { id: string; english: string; uzbek: string; example: string; exampleUz: string; phonetic: string; partOfSpeech: string; difficulty: number; audioFileId: string | null; imageFileId: string | null };
type ListMeta = { id: string; title: string; description: string; level: string; topic: string; status: string };

function useRun() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = <T,>(fn: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, msg?: string, after?: (d: T) => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (msg) toast.success(msg);
        after?.(r.data);
        router.refresh();
      } else toast.error(r.error);
    });
  return { pending, run };
}

function MetaFields({ v, set }: { v: Omit<ListMeta, "id" | "status">; set: (p: Partial<ListMeta>) => void }) {
  return (
    <>
      <Field label="Nomi" required>
        <Input value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Unit 3 — Travel" maxLength={120} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Daraja">
          <Input value={v.level} onChange={(e) => set({ level: e.target.value })} list="wl-levels" placeholder="A2" maxLength={40} />
        </Field>
        <Field label="Mavzu">
          <Input value={v.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="Travel" maxLength={120} />
        </Field>
      </div>
      <datalist id="wl-levels">{LEVELS.map((l) => <option key={l} value={l} />)}</datalist>
      <Field label="Izoh">
        <Textarea rows={2} value={v.description} onChange={(e) => set({ description: e.target.value })} maxLength={2000} />
      </Field>
    </>
  );
}

export function NewWordListButton({ base }: { base: string }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ title: "", description: "", level: "", topic: "" });
  const { pending, run } = useRun();
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Yangi ro‘yxat
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Yangi lug‘at ro‘yxati">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveWordListAction(null, v), "Ro‘yxat yaratildi", (d) => router.push(`${base}/vocabulary/${d.id}`));
          }}
        >
          <MetaFields v={v} set={(p) => setV((x) => ({ ...x, ...p }))} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" loading={pending}>
              Yaratish
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

const emptyWord = { english: "", uzbek: "", example: "", exampleUz: "", phonetic: "", partOfSpeech: "", difficulty: 2, audioFileId: null as string | null, imageFileId: null as string | null };

function WordForm({ initial, onSave, onCancel, pending }: { initial: typeof emptyWord; onSave: (w: typeof emptyWord) => void; onCancel?: () => void; pending: boolean }) {
  const [w, setW] = useState(initial);
  const [up, setUp] = useState<"" | "audio" | "image">("");
  const set = (p: Partial<typeof emptyWord>) => setW((x) => ({ ...x, ...p }));
  const upload = async (file: File, kind: "audio" | "image") => {
    setUp(kind);
    try {
      const f = await uploadFile(file, kind === "image" ? { imagesOnly: true } : {});
      set(kind === "audio" ? { audioFileId: f.id } : { imageFileId: f.id });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUp("");
    }
  };
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(w);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Inglizcha" required>
          <Input value={w.english} onChange={(e) => set({ english: e.target.value })} placeholder="journey" maxLength={120} autoCapitalize="none" spellCheck={false} />
        </Field>
        <Field label="O‘zbekcha" required hint="Bir nechta ma’noni vergul bilan yozing">
          <Input value={w.uzbek} onChange={(e) => set({ uzbek: e.target.value })} placeholder="sayohat, safar" maxLength={200} />
        </Field>
        <Field label="Misol (EN)">
          <Input value={w.example} onChange={(e) => set({ example: e.target.value })} placeholder="It was a long journey." maxLength={500} />
        </Field>
        <Field label="Misol tarjimasi">
          <Input value={w.exampleUz} onChange={(e) => set({ exampleUz: e.target.value })} maxLength={500} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Transkripsiya">
          <Input value={w.phonetic} onChange={(e) => set({ phonetic: e.target.value })} placeholder="/ˈdʒɜːni/" maxLength={80} />
        </Field>
        <Field label="So‘z turkumi">
          <Input value={w.partOfSpeech} onChange={(e) => set({ partOfSpeech: e.target.value })} placeholder="noun" maxLength={30} />
        </Field>
        <Field label="Qiyinlik">
          <Select value={w.difficulty} onChange={(e) => set({ difficulty: Number(e.target.value) })}>
            <option value={1}>Oson</option>
            <option value={2}>O‘rta</option>
            <option value={3}>Qiyin</option>
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(["audio", "image"] as const).map((k) => {
          const id = k === "audio" ? w.audioFileId : w.imageFileId;
          return id ? (
            <Badge key={k} tone="primary" className="gap-1.5">
              {k === "audio" ? "Audio biriktirildi" : "Rasm biriktirildi"}
              <button type="button" onClick={() => set(k === "audio" ? { audioFileId: null } : { imageFileId: null })} aria-label="Olib tashlash">
                <X className="size-3" />
              </button>
            </Badge>
          ) : (
            <label key={k} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border-strong px-3 text-[12.5px] font-medium text-text-2 hover:border-primary hover:text-primary">
              {k === "audio" ? <Music className="size-3.5" aria-hidden /> : <ImagePlus className="size-3.5" aria-hidden />}
              {up === k ? "Yuklanmoqda…" : k === "audio" ? "Talaffuz audiosi" : "Rasm"}
              <input
                type="file"
                hidden
                accept={k === "audio" ? "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/webm,audio/aac" : "image/png,image/jpeg,image/webp,image/gif"}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) upload(f, k);
                }}
              />
            </label>
          );
        })}
        <div className="ml-auto flex gap-2">
          {onCancel ? (
            <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
              Bekor qilish
            </Button>
          ) : null}
          <Button type="submit" size="sm" loading={pending} disabled={!w.english.trim() || !w.uzbek.trim() || !!up}>
            <Save /> Saqlash
          </Button>
        </div>
      </div>
    </form>
  );
}

export function WordListEditor({ list, words, canEdit }: { list: ListMeta; words: Word[]; canEdit: boolean }) {
  const [meta, setMeta] = useState({ title: list.title, description: list.description, level: list.level, topic: list.topic });
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(words.length === 0);
  const [csvOpen, setCsvOpen] = useState(false);
  const [q, setQ] = useState("");
  const [formKey, setFormKey] = useState(0);
  const { pending, run } = useRun();
  const shown = useMemo(() => words.filter((w) => !q || w.english.toLowerCase().includes(q.toLowerCase()) || w.uzbek.toLowerCase().includes(q.toLowerCase())), [words, q]);

  return (
    <div className="space-y-5">
      {canEdit ? (
        <Card>
          <CardHeader
            title="Ro‘yxat"
            action={
              <div className="flex flex-wrap gap-2">
                {list.status !== "published" ? (
                  <Button size="sm" loading={pending} onClick={() => run(() => wordListStatusAction(list.id, "published"), "E’lon qilindi")}>
                    <Send /> E’lon qilish
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => wordListStatusAction(list.id, "draft"), "Qoralamaga qaytarildi")}>
                    <RotateCcw /> Qoralamaga
                  </Button>
                )}
                {list.status !== "archived" ? (
                  <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => wordListStatusAction(list.id, "archived"), "Arxivlandi")}>
                    <Archive /> Arxivlash
                  </Button>
                ) : null}
              </div>
            }
          />
          <CardBody className="space-y-4">
            <MetaFields v={meta} set={(p) => setMeta((x) => ({ ...x, ...p }))} />
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" loading={pending} onClick={() => run(() => saveWordListAction(list.id, meta), "Saqlandi")}>
                <Save /> Saqlash
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Alert tone="info">Bu ro‘yxatni faqat muallif yoki administrator tahrirlaydi. Siz uni o‘z guruhlaringizga biriktirishingiz mumkin.</Alert>
      )}

      <Card className="overflow-hidden">
        <CardHeader
          title={`So‘zlar (${words.length})`}
          action={
            canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setCsvOpen(true)}>
                  <FileUp /> CSV import
                </Button>
                <Button size="sm" onClick={() => setAdding(true)}>
                  <Plus /> So‘z
                </Button>
              </div>
            ) : null
          }
        />
        {adding && canEdit ? (
          <div className="border-b border-border bg-surface-2/40 px-5 py-4">
            <WordForm
              key={formKey}
              initial={emptyWord}
              pending={pending}
              onCancel={words.length ? () => setAdding(false) : undefined}
              onSave={(w) => run(() => saveWordAction(list.id, null, w), "So‘z qo‘shildi", () => setFormKey((k) => k + 1))}
            />
          </div>
        ) : null}
        {words.length > 8 ? (
          <div className="relative border-b border-border px-5 py-3">
            <Search className="pointer-events-none absolute top-1/2 left-8 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish" className="pl-9" aria-label="So‘z qidirish" />
          </div>
        ) : null}
        <ul className="divide-y divide-border">
          {shown.map((w) =>
            editing === w.id ? (
              <li key={w.id} className="bg-surface-2/40 px-5 py-4">
                <WordForm initial={w} pending={pending} onCancel={() => setEditing(null)} onSave={(v) => run(() => saveWordAction(list.id, w.id, v), "Saqlandi", () => setEditing(null))} />
              </li>
            ) : (
              <li key={w.id} className="flex items-start gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold">{w.english}</span>
                    {w.phonetic ? <span className="text-[12px] text-muted">{w.phonetic}</span> : null}
                    {w.audioFileId ? <Music className="size-3.5 text-violet" aria-label="audio bor" /> : null}
                  </div>
                  <div className="text-[13.5px] text-text-2">{w.uzbek}</div>
                  {w.example ? <div className="text-[12.5px] text-muted italic">{w.example}</div> : null}
                </div>
                {canEdit ? (
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(w.id)} aria-label={`${w.english} — tahrirlash`}>
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:text-danger"
                      aria-label={`${w.english} — o‘chirish`}
                      onClick={() => confirm(`“${w.english}” o‘chirilsinmi? O‘quvchilar tarixi saqlanadi.`) && run(() => removeWordAction(list.id, w.id), "O‘chirildi")}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ) : null}
              </li>
            ),
          )}
          {!words.length && !adding ? <li className="px-5 py-8 text-center text-[13.5px] text-muted">Hali so‘z yo‘q.</li> : null}
        </ul>
      </Card>

      <WordCsvDialog open={csvOpen} onClose={() => setCsvOpen(false)} listId={list.id} existing={words.map((w) => w.english)} />
    </div>
  );
}

function WordCsvDialog({ open, onClose, listId, existing }: { open: boolean; onClose: () => void; listId: string; existing: string[] }) {
  const [text, setText] = useState("");
  const { pending, run } = useRun();
  const preview = text.trim() ? parseWordCsv(text, existing) : null;
  const template = () => {
    const sample = `${WORD_CSV_HEADER}\njourney,"sayohat, safar",It was a long journey.,Bu uzoq sayohat edi.,/ˈdʒɜːni/,noun,2\nbook,kitob,I am reading a book.,,/bʊk/,noun,1\n`;
    const url = URL.createObjectURL(new Blob(["﻿" + sample], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: "lugat-namuna.csv" }).click();
    URL.revokeObjectURL(url);
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="So‘zlarni CSV’dan import qilish"
      description="Ustunlar: english, uzbek, example, example_uz, phonetic, part_of_speech, difficulty (1–3). Takroriy so‘zlar o‘tkazib yuboriladi."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            disabled={!preview || !!preview.errors.length || !preview.rows.length}
            loading={pending}
            onClick={() =>
              run(() => importWordsAction(listId, text), undefined, (r) => {
                if (r.errors.length) return toast.error(`${r.errors[0].line}-qator: ${r.errors[0].message}`);
                toast.success(`${r.added} ta so‘z qo‘shildi${r.duplicates.length ? `, ${r.duplicates.length} ta takroriy o‘tkazib yuborildi` : ""}`);
                setText("");
                onClose();
              })
            }
          >
            Import{preview?.rows.length ? ` (${preview.rows.length})` : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={template}>
            <Download /> Namuna CSV
          </Button>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[13px] font-medium hover:bg-surface-2">
            <FileUp className="size-4" aria-hidden /> Fayl tanlash
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) setText(await f.text());
              }}
            />
          </label>
        </div>
        <Textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={`${WORD_CSV_HEADER}\nbook,kitob,I read a book.`} aria-label="CSV matni" className="font-mono text-[12.5px]" spellCheck={false} />
        {preview ? (
          preview.errors.length ? (
            <Alert tone="danger" title={`${preview.errors.length} ta xato`}>
              <ul className="max-h-36 space-y-0.5 overflow-y-auto text-[12.5px]">
                {preview.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    {e.line}-qator: {e.message}
                  </li>
                ))}
              </ul>
            </Alert>
          ) : (
            <Alert tone="success">
              {preview.rows.length} ta yangi so‘z.{preview.duplicates.length ? ` ${preview.duplicates.length} ta takroriy (${preview.duplicates.slice(0, 5).join(", ")}${preview.duplicates.length > 5 ? "…" : ""}) o‘tkazib yuboriladi.` : ""}
            </Alert>
          )
        ) : null}
      </div>
    </Dialog>
  );
}

export function WordListTargets({ listId, published, classes, students, initialClassIds, initialStudentIds }: { listId: string; published: boolean; classes: { id: string; name: string; students: number }[]; students: { id: string; displayName: string; className: string }[]; initialClassIds: string[]; initialStudentIds: string[] }) {
  const [classIds, setClassIds] = useState(initialClassIds);
  const [studentIds, setStudentIds] = useState(initialStudentIds);
  const [q, setQ] = useState("");
  const { pending, run } = useRun();
  const toggle = (arr: string[], id: string, on: boolean) => (on ? [...arr, id] : arr.filter((x) => x !== id));
  const filtered = students.filter((s) => !q || s.displayName.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  return (
    <Card>
      <CardHeader title="Kimlarga" icon={<Users />} description={published ? "Biriktirilganlarga bildirishnoma yuboriladi." : "Ro‘yxat e’lon qilinganda o‘quvchilarga ko‘rinadi."} />
      <CardBody className="space-y-5">
        <div>
          <div className="mb-2 text-[13px] font-medium text-text-2">Guruhlar</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {classes.map((c) => (
              <Checkbox key={c.id} checked={classIds.includes(c.id)} onChange={(on) => setClassIds((x) => toggle(x, c.id, on))} className="rounded-xl border border-border p-3" label={<span>{c.name} <span className="text-muted">· {c.students} o‘quvchi</span></span>} />
            ))}
            {!classes.length ? <p className="text-[13px] text-muted">Sizga biriktirilgan guruh yo‘q.</p> : null}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[13px] font-medium text-text-2">Alohida o‘quvchilar</div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism bo‘yicha qidirish" aria-label="O‘quvchi qidirish" className="mb-2" />
          <div className="grid max-h-72 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {filtered.map((s) => (
              <Checkbox key={s.id} checked={studentIds.includes(s.id)} onChange={(on) => setStudentIds((x) => toggle(x, s.id, on))} label={<span>{s.displayName} <span className="text-muted">{s.className}</span></span>} />
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button loading={pending} onClick={() => run(() => wordListTargetsAction(listId, { classIds, studentIds }), "Saqlandi")}>
            <Save /> Saqlash
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
