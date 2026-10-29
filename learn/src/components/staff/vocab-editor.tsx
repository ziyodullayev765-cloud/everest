"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, FileUp, ListPlus, ImagePlus, Music, Pencil, Plus, RotateCcw, Save, Search, Send, Trash2, Users, X } from "lucide-react";
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
import { parseWordList } from "@/lib/word-csv";
import { tr } from "@/lib/i18n/tr";

type Word = { id: string; english: string; uzbek: string; example: string; exampleUz: string; phonetic: string; partOfSpeech: string; difficulty: number; definition: string; synonyms: string; unit: string; tags: string; audioFileId: string | null; imageFileId: string | null; updatedAt?: Date };
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
      <Field label={tr("Nomi")} required>
        <Input value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder={tr("Unit 3 — Travel")} maxLength={120} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={tr("Daraja")}>
          <Input value={v.level} onChange={(e) => set({ level: e.target.value })} list="wl-levels" placeholder="A2" maxLength={40} />
        </Field>
        <Field label={tr("Mavzu")}>
          <Input value={v.topic} onChange={(e) => set({ topic: e.target.value })} placeholder={tr("Travel")} maxLength={120} />
        </Field>
      </div>
      <datalist id="wl-levels">{LEVELS.map((l) => <option key={l} value={l} />)}</datalist>
      <Field label={tr("Izoh")}>
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
        <Plus /> {tr("Yangi ro‘yxat")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={tr("Yangi lug‘at ro‘yxati")}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveWordListAction(null, v), tr("Ro‘yxat yaratildi"), (d) => router.push(`${base}/vocabulary/${d.id}`));
          }}
        >
          <MetaFields v={v} set={(p) => setV((x) => ({ ...x, ...p }))} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {tr("Bekor qilish")}
            </Button>
            <Button type="submit" loading={pending}>
              {tr("Yaratish")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

const emptyWord = { english: "", uzbek: "", example: "", exampleUz: "", phonetic: "", partOfSpeech: "", difficulty: 2, definition: "", synonyms: "", unit: "", tags: "", audioFileId: null as string | null, imageFileId: null as string | null };

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
        <Field label={tr("Inglizcha")} required>
          <Input value={w.english} onChange={(e) => set({ english: e.target.value })} placeholder="journey" maxLength={120} autoCapitalize="none" spellCheck={false} />
        </Field>
        <Field label={tr("O‘zbekcha tarjima")} required hint={tr("Bir nechta ma’noni vergul bilan yozing")}>
          <Input value={w.uzbek} onChange={(e) => set({ uzbek: e.target.value })} placeholder={tr("sayohat, safar")} maxLength={200} />
        </Field>
        <Field label={tr("Misol (EN)")}>
          <Input value={w.example} onChange={(e) => set({ example: e.target.value })} placeholder={tr("It was a long journey.")} maxLength={500} />
        </Field>
        <Field label={tr("Misol tarjimasi")}>
          <Input value={w.exampleUz} onChange={(e) => set({ exampleUz: e.target.value })} maxLength={500} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label={tr("Transkripsiya")}>
          <Input value={w.phonetic} onChange={(e) => set({ phonetic: e.target.value })} placeholder="/ˈdʒɜːni/" maxLength={80} />
        </Field>
        <Field label={tr("So‘z turkumi")}>
          <Input value={w.partOfSpeech} onChange={(e) => set({ partOfSpeech: e.target.value })} placeholder="noun" maxLength={30} />
        </Field>
        <Field label={tr("Qiyinlik")}>
          <Select value={w.difficulty} onChange={(e) => set({ difficulty: Number(e.target.value) })}>
            <option value={1}>{tr("Oson")}</option>
            <option value={2}>{tr("O‘rta")}</option>
            <option value={3}>{tr("Qiyin")}</option>
          </Select>
        </Field>
      </div>
      <details open={!!(w.definition || w.synonyms || w.unit || w.tags)}>
        <summary className="cursor-pointer text-[13px] font-bold text-primary">{tr("Qo‘shimcha: ta’rif, sinonimlar, unit, teglar")}</summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field label={tr("Ta’rif")} className="sm:col-span-2">
            <Input value={w.definition} onChange={(e) => set({ definition: e.target.value })} placeholder={tr("a trip from one place to another")} maxLength={500} />
          </Field>
          <Field label={tr("Sinonimlar")}>
            <Input value={w.synonyms} onChange={(e) => set({ synonyms: e.target.value })} placeholder="trip, voyage" maxLength={300} />
          </Field>
          <Field label={tr("Unit / dars")}>
            <Input value={w.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="Unit 3" maxLength={60} />
          </Field>
          <Field label={tr("Teglar")} className="sm:col-span-2">
            <Input value={w.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="travel, ielts" maxLength={200} />
          </Field>
        </div>
      </details>
      <div className="flex flex-wrap items-center gap-2">
        {(["audio", "image"] as const).map((k) => {
          const id = k === "audio" ? w.audioFileId : w.imageFileId;
          return id ? (
            <Badge key={k} tone="primary" className="gap-1.5">
              {k === "audio" ? tr("Audio biriktirildi") : tr("Rasm biriktirildi")}
              <button type="button" onClick={() => set(k === "audio" ? { audioFileId: null } : { imageFileId: null })} aria-label={tr("Olib tashlash")}>
                <X className="size-3" />
              </button>
            </Badge>
          ) : (
            <label key={k} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-border-strong px-3 text-[12.5px] font-semibold text-text-2 hover:border-primary hover:text-primary">
              {k === "audio" ? <Music className="size-3.5" aria-hidden /> : <ImagePlus className="size-3.5" aria-hidden />}
              {up === k ? tr("Yuklanmoqda…") : k === "audio" ? tr("Talaffuz audiosi") : tr("Rasm")}
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
              {tr("Bekor qilish")}
            </Button>
          ) : null}
          <Button type="submit" size="sm" loading={pending} disabled={!w.english.trim() || !w.uzbek.trim() || !!up}>
            <Save /> {tr("Saqlash")}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function WordListEditor({ list, words, canEdit }: { list: ListMeta; words: Word[]; canEdit: boolean }) {
  const [meta, setMeta] = useState({ title: list.title, description: list.description, level: list.level, topic: list.topic });
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [autoBulk] = useState(words.length === 0 && canEdit);
  const [csvOpen, setCsvOpen] = useState(autoBulk);
  const [q, setQ] = useState("");
  const [formKey, setFormKey] = useState(0);
  const { pending, run } = useRun();
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return words.filter((w) => !k || [w.english, w.uzbek, w.unit, w.tags].some((x) => x.toLowerCase().includes(k)));
  }, [words, q]);

  return (
    <div className="space-y-5">
      {canEdit ? (
        <Card>
          <CardHeader
            title={tr("Ro‘yxat")}
            action={
              <div className="flex flex-wrap gap-2">
                {list.status !== "published" ? (
                  <Button size="sm" loading={pending} onClick={() => run(() => wordListStatusAction(list.id, "published"), tr("E’lon qilindi"))}>
                    <Send /> {tr("E’lon qilish")}
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" loading={pending} onClick={() => run(() => wordListStatusAction(list.id, "draft"), tr("Qoralamaga qaytarildi"))}>
                    <RotateCcw /> {tr("Qoralamaga")}
                  </Button>
                )}
                {list.status !== "archived" ? (
                  <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => wordListStatusAction(list.id, "archived"), "Arxivlandi")}>
                    <Archive /> {tr("Arxivlash")}
                  </Button>
                ) : null}
              </div>
            }
          />
          <CardBody className="space-y-4">
            <MetaFields v={meta} set={(p) => setMeta((x) => ({ ...x, ...p }))} />
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" loading={pending} onClick={() => run(() => saveWordListAction(list.id, meta), "Saqlandi")}>
                <Save /> {tr("Saqlash")}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Alert tone="info">{tr("Bu ro‘yxatni faqat muallif yoki administrator tahrirlaydi. Siz uni o‘z guruhlaringizga biriktirishingiz mumkin.")}</Alert>
      )}

      <Card className="overflow-hidden">
        <CardHeader
          title={tr("So‘zlar ({0})", words.length)}
          action={
            canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setCsvOpen(true)}>
                  <ListPlus /> {tr("Ko‘plab qo‘shish")}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
                  <Plus /> {tr("Bitta so‘z")}
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
              onSave={(w) => run(() => saveWordAction(list.id, null, w), tr("So‘z qo‘shildi"), () => setFormKey((k) => k + 1))}
            />
          </div>
        ) : null}
        {words.length > 8 ? (
          <div className="relative border-b border-border px-5 py-3">
            <Search className="pointer-events-none absolute top-1/2 left-8 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Qidirish")} className="pl-9" aria-label={tr("So‘z qidirish")} />
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
                    <span className="font-bold">{w.english}</span>
                    {w.phonetic ? <span className="text-[12px] text-muted">{w.phonetic}</span> : null}
                    {w.audioFileId ? <Music className="size-3.5 text-violet" aria-label={tr("audio bor")} /> : null}
                    {w.unit ? <Badge>{w.unit}</Badge> : null}
                  </div>
                  <div className="text-[13.5px] text-text-2">{w.uzbek}</div>
                  {w.example ? <div className="text-[12.5px] text-muted italic">{w.example}</div> : null}
                </div>
                {canEdit ? (
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(w.id)} aria-label={tr("{0} — tahrirlash", w.english)}>
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:text-danger"
                      aria-label={tr("{0} — o‘chirish", w.english)}
                      onClick={() => confirm(tr("“{0}” o‘chirilsinmi? O‘quvchilar tarixi saqlanadi.", w.english)) && run(() => removeWordAction(list.id, w.id), tr("O‘chirildi"))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ) : null}
              </li>
            ),
          )}
          {!words.length && !adding ? <li className="px-5 py-8 text-center text-[13.5px] text-muted">{tr("Hali so‘z yo‘q.")}</li> : null}
        </ul>
      </Card>

      <WordBulkDialog open={csvOpen} onClose={() => setCsvOpen(false)} listId={list.id} existing={words.map((w) => w.english)} />
    </div>
  );
}

const EXAMPLE = `journey - sayohat, safar
luggage — yuk | Don't forget your luggage.
souvenir: esdalik sovg‘a
abroad /əˈbrɔːd/ - chet elda`;

/** Bulk entry: paste a list (any common separator), copy from Excel/Sheets, or pick a CSV/TXT file. */
function WordBulkDialog({ open, onClose, listId, existing }: { open: boolean; onClose: () => void; listId: string; existing: string[] }) {
  const [text, setText] = useState("");
  const [swap, setSwap] = useState(false);
  const { pending, run } = useRun();
  const preview = useMemo(() => (text.trim() ? parseWordList(text, existing, swap) : null), [text, existing, swap]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={tr("So‘zlarni ko‘plab qo‘shish")}
      description={tr("Har qatorga bitta so‘z yozing yoki ro‘yxatni nusxalab qo‘ying. Takroriy so‘zlar o‘tkazib yuboriladi.")}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tr("Bekor qilish")}
          </Button>
          <Button
            disabled={!preview || !preview.rows.length}
            loading={pending}
            onClick={() =>
              run(() => importWordsAction(listId, preview && preview.errors.length ? toLines(preview.rows) : text, preview && preview.errors.length ? false : swap), undefined, (r) => {
                if (r.errors.length) return toast.error(`${r.errors[0].line}-qator: ${r.errors[0].message}`);
                toast.success(tr("{0} ta so‘z qo‘shildi{1}", r.added, r.duplicates.length ? tr(", {0} ta takroriy o‘tkazib yuborildi", r.duplicates.length) : ""));
                setText("");
                onClose();
              })
            }
          >
            {preview?.rows.length ? tr("{0} ta so‘zni qo‘shish", preview.rows.length) : tr("Qo‘shish")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} aria-label={tr("So‘zlar ro‘yxati")} className="font-mono text-[13px]" spellCheck={false} autoFocus />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold hover:bg-surface-2">
            <FileUp className="size-4" aria-hidden /> {tr("Fayldan (CSV / TXT)")}
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) setText(await f.text());
              }}
            />
          </label>
          <Checkbox checked={swap} onChange={setSwap} label={tr("Qatorlar o‘zbekcha so‘z bilan boshlanadi")} />
        </div>
        <p className="text-[12px] leading-relaxed text-muted">
          {tr("Ajratuvchi:")} <code>-</code> <code>—</code> <code>:</code> <code>=</code> {tr("yoki Excel ustunlari. Misol qo‘shish uchun")} <code>|</code> {tr("qo‘ying.")} <code>{tr("(n)")}</code>, <code>{tr("(v)")}</code> {tr("va")} <code>{tr("/transkripsiya/")}</code> {tr("avtomatik ajratiladi.")}
        </p>
        {preview ? (
          <>
            {preview.errors.length ? (
              <Alert tone="warning" title={tr("{0} ta qator tushunilmadi — ular qo‘shilmaydi", preview.errors.length)}>
                <ul className="max-h-28 space-y-0.5 overflow-y-auto text-[12.5px]">
                  {preview.errors.slice(0, 30).map((e, i) => (
                    <li key={i}>
                      {tr("{0}-qator: {1}", e.line, e.message)}
                    </li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            {preview.duplicates.length ? <p className="text-[12.5px] text-muted">{tr("Takroriy (o‘tkazib yuboriladi): {0}{1}", preview.duplicates.slice(0, 8).join(", "), preview.duplicates.length > 8 ? "…" : "")}</p> : null}
            {preview.rows.length ? (
              <div className="max-h-60 overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 bg-surface-2 text-left text-[11.5px] text-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">{tr("English")}</th>
                      <th className="px-3 py-2 font-semibold">{tr("O‘zbekcha")}</th>
                      <th className="hidden px-3 py-2 font-semibold sm:table-cell">{tr("Misol")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.rows.slice(0, 200).map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 font-semibold">
                          {r.english} {r.phonetic ? <span className="font-normal text-muted">{r.phonetic}</span> : null}
                        </td>
                        <td className="px-3 py-1.5">{r.uzbek}</td>
                        <td className="hidden max-w-56 truncate px-3 py-1.5 text-muted sm:table-cell">{r.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Dialog>
  );
}

/** Re-serialise only the understood rows (tab-separated) so problem lines are skipped, not blocking. */
function toLines(rows: { english: string; uzbek: string; example: string; exampleUz: string; phonetic: string; partOfSpeech: string }[]) {
  const c = (v: string) => v.replace(/[\t\r\n]+/g, " ");
  const head = (r: (typeof rows)[number]) => [r.english, r.partOfSpeech ? `(${r.partOfSpeech})` : "", r.phonetic].filter(Boolean).join(" ");
  return rows.map((r) => [c(head(r)), c(r.uzbek), c(r.example), c(r.exampleUz)].join("\t")).join("\n");
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
      <CardHeader title={tr("Kimlarga")} icon={<Users />} description={published ? tr("Biriktirilganlarga bildirishnoma yuboriladi.") : tr("Ro‘yxat e’lon qilinganda o‘quvchilarga ko‘rinadi.")} />
      <CardBody className="space-y-5">
        <div>
          <div className="mb-2 text-[13px] font-semibold text-text-2">{tr("Guruhlar")}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {classes.map((c) => (
              <Checkbox key={c.id} checked={classIds.includes(c.id)} onChange={(on) => setClassIds((x) => toggle(x, c.id, on))} className="rounded-xl border border-border p-3" label={<span>{c.name} <span className="text-muted">{tr("· {0} o‘quvchi", c.students)}</span></span>} />
            ))}
            {!classes.length ? <p className="text-[13px] text-muted">{tr("Sizga biriktirilgan guruh yo‘q.")}</p> : null}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[13px] font-semibold text-text-2">{tr("Alohida o‘quvchilar")}</div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Ism bo‘yicha qidirish")} aria-label={tr("O‘quvchi qidirish")} className="mb-2" />
          <div className="grid max-h-72 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {filtered.map((s) => (
              <Checkbox key={s.id} checked={studentIds.includes(s.id)} onChange={(on) => setStudentIds((x) => toggle(x, s.id, on))} label={<span>{s.displayName} <span className="text-muted">{s.className}</span></span>} />
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button loading={pending} onClick={() => run(() => wordListTargetsAction(listId, { classIds, studentIds }), "Saqlandi")}>
            <Save /> {tr("Saqlash")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
