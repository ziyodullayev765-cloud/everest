"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { navigate } from "@/lib/navigate";
import { AlertTriangle, FileSpreadsheet, FileUp, Upload } from "lucide-react";
import { previewImportAction, runImportAction } from "@/app/actions/vocab";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { IMPORT_FIELDS, MAX_IMPORT_BYTES, ROW_STATUS, type ColumnMapping, type RowStatus } from "@/lib/vocab-import";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/tr";

type ListOpt = { id: string; title: string; status: string; words: number };
type ClassOpt = { id: string; name: string; students: number };
type Preview = {
  format: string;
  headers: string[];
  sample: string[][];
  mapping: ColumnMapping;
  ready: boolean;
  notes: string[];
  counts: Record<RowStatus, number>;
  total: number;
  rows: { line: number; status: RowStatus; english: string; uzbek: string; message?: string; changes?: string[] }[];
  previousImport: { id: string; at: Date } | null;
};

const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/**
 * Import wizard: 1) where (set + groups) 2) source (file or pasted text) 3) column mapping + preview
 * with each row's status 4) duplicate policy + confirm. The server re-reads and re-validates the file.
 */
export function ImportWizard({ base, lists, classes, initialListId }: { base: string; lists: ListOpt[]; classes: ClassOpt[]; initialListId?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">(initialListId || lists.length ? "existing" : "new");
  const [listId, setListId] = useState(initialListId ?? lists[0]?.id ?? "");
  const [newList, setNewList] = useState({ title: "", level: "", topic: "" });
  const [classIds, setClassIds] = useState<string[]>([]);
  const [publish, setPublish] = useState(true);
  const [source, setSource] = useState<{ fileName: string; base64?: string; text?: string } | null>(null);
  const [paste, setPaste] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [policy, setPolicy] = useState<"skip" | "update">("skip");
  const [filter, setFilter] = useState<RowStatus | "all">("all");
  const [loading, startPreview] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const target = mode === "existing" ? listId || null : null;

  // Re-check whenever the source, the set or the mapping changes (the newest answer wins).
  useEffect(() => {
    if (!source) return;
    const n = ++seq.current;
    startPreview(async () => {
      const r = await previewImportAction({ ...source, listId: target, mapping: mapping ?? undefined });
      if (n !== seq.current) return;
      if (r.ok) {
        setPreview(r.data as Preview);
        setError(null);
        if (!mapping) setMapping(r.data.mapping);
      } else {
        setPreview(null);
        setError(r.error);
      }
    });
  }, [source, target, mapping]);

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) return toast.error(tr("Fayl juda katta (ko‘pi bilan 3 MB). Uni bir nechta faylga bo‘ling."));
    setMapping(null);
    setSource({ fileName: f.name, base64: toBase64(await f.arrayBuffer()) });
  };

  const confirm = () =>
    startSave(async () => {
      if (!source || !mapping) return;
      const r = await runImportAction({ ...source, mapping, listId: target, newList: mode === "new" ? newList : null, classIds, policy, publish });
      if (!r.ok) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      toast.success(tr("Import tugadi"));
      navigate(router, `${base}/vocabulary/imports/${r.data.jobId}`);
    });

  const c = preview?.counts;
  const writes = c ? c.new + (policy === "update" ? c.exists_changed : 0) : 0;
  const destOk = mode === "existing" ? !!listId : newList.title.trim().length >= 2;
  const shown = preview?.rows.filter((r) => filter === "all" || r.status === filter) ?? [];
  const step = (n: number, title: string, desc?: string) => <CardHeader title={<span className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-primary text-[13px] font-black text-primary-fg">{n}</span>{title}</span>} description={desc} />;

  return (
    <div className="space-y-5">
      <Card>
        {step(1, tr("Qayerga import qilinadi"), tr("Mavjud ro‘yxat yoki yangi ro‘yxat, va qaysi guruhlar ko‘radi"))}
        <CardBody className="space-y-4 pt-3">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr("Ro‘yxat")}>
            {(["existing", "new"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={m === "existing" && !lists.length} onClick={() => setMode(m)} className={cn("rounded-full border-2 px-4 py-1.5 text-[13.5px] font-extrabold disabled:opacity-40", mode === m ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-text-2")}>
                {m === "existing" ? tr("Mavjud ro‘yxatga") : tr("Yangi ro‘yxat")}
              </button>
            ))}
          </div>
          {mode === "existing" ? (
            <Field label={tr("Ro‘yxat")} required>
              <Select value={listId} onChange={(e) => setListId(e.target.value)}>
                {lists.map((l) => <option key={l.id} value={l.id}>{l.title} · {tr("{0} ta so‘z", l.words)}{l.status === "draft" ? ` · ${tr("Qoralama")}` : ""}</option>)}
              </Select>
            </Field>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={tr("Nomi")} required className="sm:col-span-3"><Input value={newList.title} onChange={(e) => setNewList({ ...newList, title: e.target.value })} placeholder={tr("Unit 1 — Family")} maxLength={120} /></Field>
              <Field label={tr("Daraja")}><Input value={newList.level} onChange={(e) => setNewList({ ...newList, level: e.target.value })} placeholder="A2" maxLength={40} /></Field>
              <Field label={tr("Mavzu")} className="sm:col-span-2"><Input value={newList.topic} onChange={(e) => setNewList({ ...newList, topic: e.target.value })} maxLength={120} /></Field>
            </div>
          )}
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-text-2">{tr("Qaysi guruhlarga biriktirilsin (ixtiyoriy; mavjud biriktirishlar o‘zgarmaydi)")}</legend>
            {classes.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {classes.map((g) => (
                  <Checkbox key={g.id} checked={classIds.includes(g.id)} onChange={(on) => setClassIds((x) => (on ? [...x, g.id] : x.filter((y) => y !== g.id)))} label={<span>{g.name} <span className="text-muted">· {tr("{0} o‘quvchi", g.students)}</span></span>} />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">{tr("Sizga hali guruh biriktirilmagan.")}</p>
            )}
          </fieldset>
          <Checkbox checked={publish} onChange={setPublish} label={tr("Import tugagach ro‘yxatni e’lon qilish (o‘quvchilar ko‘ra boshlaydi)")} />
        </CardBody>
      </Card>

      <Card>
        {step(2, tr("Fayl yoki matn"), tr("CSV, Excel (.xlsx), JSON yoki TXT · ko‘pi bilan 3 MB va 5000 qator · UTF-8"))}
        <CardBody className="space-y-3 pt-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border-strong bg-surface-2/40 px-4 py-6 text-center hover:bg-surface-2">
            <Upload className="size-6 text-primary" aria-hidden />
            <span className="text-[14px] font-bold">{source?.base64 ? source.fileName : tr("Faylni tanlang")}</span>
            <span className="text-[12.5px] text-muted">{tr("Ustunlar istalgan tartibda: English/Word/Term, Uzbek/Translation/Tarjima, Example, Part of speech…")}</span>
            <input type="file" className="sr-only" accept=".csv,.tsv,.txt,.json,.xlsx,text/csv,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => pickFile(e.target.files?.[0])} />
          </label>
          <details>
            <summary className="cursor-pointer text-[13px] font-bold text-primary">{tr("Yoki matnni qo‘ying")}</summary>
            <Textarea className="mt-2 font-mono text-[13px]" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"english,uzbek,example\njourney,sayohat,It was a long journey.\n\n" + tr("yoki: journey - sayohat")} />
            <Button type="button" variant="secondary" size="sm" className="mt-2" disabled={!paste.trim()} onClick={() => { setMapping(null); setSource({ fileName: "pasted.txt", text: paste }); }}>
              <FileUp /> {tr("Matnni tekshirish")}
            </Button>
          </details>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          {preview?.notes.map((n) => <Alert key={n} tone="warning">{n}</Alert>)}
        </CardBody>
      </Card>

      {preview ? (
        <Card>
          {step(3, tr("Ustunlar va tekshiruv"), tr("{0} qator topildi ({1}). Har bir ustun nimani bildirishini tekshiring.", preview.total, preview.format.toUpperCase()))}
          <CardBody className="space-y-4 pt-3">
            <div className="-mx-5 overflow-x-auto px-5" data-no-pull>
              <table className="w-full min-w-[560px] text-[13px]">
                <thead>
                  <tr>
                    {preview.headers.map((h, i) => (
                      <th key={i} className="min-w-36 px-2 pb-2 text-left align-bottom">
                        <div className="mb-1 truncate text-[12px] font-semibold text-muted" title={h}>{h}</div>
                        <Select aria-label={tr("“{0}” ustuni", h)} value={mapping?.[i] ?? ""} onChange={(e) => setMapping((m) => { const next = [...(m ?? preview.mapping)]; next[i] = e.target.value as ColumnMapping[number]; return next; })} className="h-9 text-[13px]">
                          <option value="">{tr("— e’tiborsiz —")}</option>
                          {IMPORT_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}{"required" in f ? " *" : ""}</option>)}
                        </Select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-text-2">
                  {preview.sample.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {preview.headers.map((_, j) => <td key={j} className="max-w-48 truncate px-2 py-1.5">{r[j] ?? ""}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!preview.ready ? (
              <Alert tone="warning">{tr("Inglizcha so‘z va tarjima ustunlarini tanlang.")}</Alert>
            ) : c ? (
              <>
                <div className="flex flex-wrap gap-2" role="tablist" aria-label={tr("Qatorlar holati")}>
                  {(["all", "new", "exists_changed", "exists_same", "duplicate_in_file", "invalid"] as const).map((s) => {
                    const n = s === "all" ? preview.total : c[s];
                    if (s !== "all" && !n) return null;
                    return (
                      <button key={s} type="button" role="tab" aria-selected={filter === s} onClick={() => setFilter(s)} className={cn("rounded-full border-2 px-3 py-1 text-[12.5px] font-bold", filter === s ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-text-2")}>
                        {s === "all" ? tr("Hammasi") : ROW_STATUS[s].label} · {n}
                      </button>
                    );
                  })}
                </div>
                <div className="max-h-80 overflow-auto rounded-xl border border-border" data-no-pull>
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 bg-surface-2 text-[12px] text-muted">
                      <tr><th className="px-3 py-2 text-left">{tr("Qator")}</th><th className="px-3 py-2 text-left">English</th><th className="px-3 py-2 text-left">{tr("Tarjima")}</th><th className="px-3 py-2 text-left">{tr("Holat")}</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {shown.map((r) => (
                        <tr key={r.line}>
                          <td className="px-3 py-1.5 text-muted tabular">{r.line}</td>
                          <td className="px-3 py-1.5 font-semibold">{r.english || "—"}</td>
                          <td className="px-3 py-1.5">{r.uzbek || "—"}</td>
                          <td className="px-3 py-1.5"><Badge tone={ROW_STATUS[r.status].tone}>{ROW_STATUS[r.status].label}</Badge>{r.message ? <span className="ml-2 text-[12px] text-muted">{r.message}</span> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.rows.length < preview.total ? <p className="px-3 py-2 text-[12px] text-muted">{tr("Birinchi {0} qator ko‘rsatildi; import hammasini tekshiradi.", preview.rows.length)}</p> : null}
                </div>
              </>
            ) : null}
            {loading ? <p className="text-[12.5px] text-muted">{tr("Tekshirilmoqda…")}</p> : null}
          </CardBody>
        </Card>
      ) : null}

      {preview?.ready && c ? (
        <Card>
          {step(4, tr("Tasdiqlash"))}
          <CardBody className="space-y-4 pt-3">
            {c.exists_changed ? (
              <fieldset className="space-y-2">
                <legend className="mb-1 text-[13px] font-semibold text-text-2">{tr("{0} ta so‘z ro‘yxatda bor, lekin fayldagi ma’lumot boshqacha:", c.exists_changed)}</legend>
                <label className="flex items-center gap-2 text-[14px]"><input type="radio" name="policy" checked={policy === "skip"} onChange={() => setPolicy("skip")} /> {tr("O‘tkazib yuborish (ro‘yxatdagisi qoladi)")}</label>
                <label className="flex items-center gap-2 text-[14px]"><input type="radio" name="policy" checked={policy === "update"} onChange={() => setPolicy("update")} /> {tr("Yangilash (fayldagi to‘ldirilgan maydonlar yoziladi)")}</label>
              </fieldset>
            ) : null}
            {preview.previousImport ? (
              <Alert tone="warning" title={tr("Bu fayl allaqachon import qilingan")}>
                {tr("{0} da. Takror so‘zlar qayta qo‘shilmaydi.", formatDateTime(preview.previousImport.at))}
              </Alert>
            ) : null}
            <ul className="grid grid-cols-2 gap-2 text-[13.5px] sm:grid-cols-4">
              <li className="rounded-xl bg-success-soft px-3 py-2 text-success"><b className="block text-[20px] tabular">{c.new}</b>{tr("qo‘shiladi")}</li>
              <li className="rounded-xl bg-warning-soft px-3 py-2 text-warning"><b className="block text-[20px] tabular">{policy === "update" ? c.exists_changed : 0}</b>{tr("yangilanadi")}</li>
              <li className="rounded-xl bg-surface-2 px-3 py-2 text-text-2"><b className="block text-[20px] tabular">{c.exists_same + c.duplicate_in_file + (policy === "skip" ? c.exists_changed : 0)}</b>{tr("o‘tkazib yuboriladi")}</li>
              <li className="rounded-xl bg-danger-soft px-3 py-2 text-danger"><b className="block text-[20px] tabular">{c.invalid}</b>{tr("xato (yozilmaydi)")}</li>
            </ul>
            {c.invalid ? (
              <p className="flex items-start gap-2 text-[13px] text-text-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />{tr("Xato qatorlar yozilmaydi va hisobotda ko‘rsatiladi. Ularni tuzatib, faylni qayta import qilishingiz mumkin — takrorlar qo‘shilmaydi.")}</p>
            ) : null}
            <Button type="button" size="lg" className="w-full sm:w-auto" loading={saving} disabled={!destOk || loading || (!writes && !classIds.length && mode === "existing")} onClick={confirm}>
              <FileSpreadsheet /> {writes ? tr("{0} ta so‘zni import qilish", writes) : tr("Importni yakunlash")}
            </Button>
            {!destOk ? <p className="text-[12.5px] text-danger">{tr("Yangi ro‘yxat nomini kiriting.")}</p> : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
