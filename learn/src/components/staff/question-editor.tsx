"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, Download, FileUp, ImagePlus, Library, Lock, Music, Plus, Save, Trash2, X, Check } from "lucide-react";
import { parseQuestionCsv, QUESTION_CSV_EXAMPLE, type CsvQuestion } from "@/lib/question-csv";
import { copyFromBankAction, saveQuestionsAction, addToBankAction, assignmentStatusAction } from "@/app/actions/staff";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RichText } from "@/components/ui/rich-text";
import { toast } from "@/components/ui/toast";
import { uploadFile } from "@/components/app/uploader";
import { countBlanks } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { QUESTION_TYPES } from "@/lib/validation/assignment";
import { AudioPlayer } from "@/components/app/media";

export type EditQuestion = {
  key: string;
  type: QuestionType;
  prompt: string;
  points: number;
  explanation: string;
  imageFileId: string | null;
  options: { label: string; isCorrect: boolean }[];
  accepted: string[][];
  caseSensitive: boolean;
  pairs: { left: string; right: string }[];
  words: string[];
  direction: "en_uz" | "uz_en" | null;
  incorrect: string;
  base: string;
  audioFileId: string | null;
};

type QuestionType = (typeof QUESTION_TYPES)[number];

type BankItem = { id: string; type: string; prompt: string; points: number; subjectName: string; ownerName: string };

const key = () => Math.random().toString(36).slice(2, 10);

export function blankQuestion(type: EditQuestion["type"]): EditQuestion {
  return {
    key: key(),
    type,
    prompt: "",
    points: type === "essay" ? 5 : 1,
    explanation: "",
    imageFileId: null,
    options:
      type === "true_false"
        ? [
            { label: "To‘g‘ri", isCorrect: true },
            { label: "Noto‘g‘ri", isCorrect: false },
          ]
        : type === "single_choice" || type === "multiple_choice"
          ? [
              { label: "", isCorrect: true },
              { label: "", isCorrect: false },
              { label: "", isCorrect: false },
            ]
          : [],
    accepted: type === "short_answer" || type === "translation" || type === "grammar_correction" ? [[]] : type === "irregular_verb" ? [[], []] : [],
    caseSensitive: false,
    pairs: type === "matching" ? [{ left: "", right: "" }, { left: "", right: "" }] : [],
    words: [],
    direction: type === "translation" ? "en_uz" : null,
    incorrect: "",
    base: "",
    audioFileId: null,
  };
}

function toPayload(q: EditQuestion) {
  const { key: _k, ...rest } = q;
  void _k;
  const accepted = rest.accepted.map((a) => a.map((x) => x.trim()).filter(Boolean));
  // arrange_words keeps only the alternatives here; the main sentence is `words`.
  return { ...rest, accepted: rest.type === "arrange_words" ? accepted.slice(0, 1) : accepted, words: rest.words.map((w) => w.trim()).filter(Boolean) };
}

export function QuestionEditor({ assignmentId, initial, locked, status, bank, subjectId }: { assignmentId: string; initial: EditQuestion[]; locked: boolean; status: string; bank: BankItem[]; subjectId: string }) {
  const [qs, setQs] = useState<EditQuestion[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  const router = useRouter();
  const total = qs.reduce((s, q) => s + Number(q.points || 0), 0);

  const update = (i: number, patch: Partial<EditQuestion>) => {
    setQs((xs) => xs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
    setDirty(true);
  };
  const move = (i: number, d: number) => {
    setQs((xs) => {
      const n = [...xs];
      const [x] = n.splice(i, 1);
      n.splice(i + d, 0, x);
      return n;
    });
    setDirty(true);
  };

  const save = (publish = false) =>
    start(async () => {
      setError(null);
      const r = await saveQuestionsAction(assignmentId, qs.map(toPayload));
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDirty(false);
      if (publish) {
        const p = await assignmentStatusAction(assignmentId, "publish");
        if (!p.ok) {
          setError(p.error);
          return;
        }
        toast.success("Quiz e’lon qilindi");
      } else toast.success("Savollar saqlandi");
      router.refresh();
    });

  if (locked)
    return (
      <div className="space-y-4">
        <Alert tone="info" title="Savollar qulflangan">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-4" aria-hidden /> O‘quvchilar bu quizni boshlagan. Natijalar buzilmasligi uchun savollarni o‘zgartirib bo‘lmaydi — o‘zgartirish kerak bo‘lsa, vazifaning nusxasini yarating.
          </span>
        </Alert>
        {qs.map((q, i) => (
          <Card key={q.key}>
            <CardBody>
              <div className="mb-1 text-[12.5px] text-muted">
                {i + 1}. {t.questionType[q.type]} · {q.points} ball
              </div>
              <RichText text={q.prompt} className="font-medium" />
            </CardBody>
          </Card>
        ))}
      </div>
    );

  return (
    <div className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13.5px] text-muted">
          <b className="text-text">{qs.length}</b> ta savol · jami <b className="text-text tabular">{total}</b> ball
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setCsvOpen(true)}>
            <FileUp /> CSV import
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setBankOpen(true)}>
            <Library /> Savollar bankidan
          </Button>
        </div>
      </div>

      {qs.length === 0 ? (
        <Card>
          <EmptyState icon={<Plus />} title="Hali savol yo‘q" description="Quyidagi tugmalar orqali birinchi savolni qo‘shing." />
        </Card>
      ) : null}

      {qs.map((q, i) => (
        <QuestionCard
          key={q.key}
          q={q}
          index={i}
          count={qs.length}
          onChange={(patch) => update(i, patch)}
          onMove={(d) => move(i, d)}
          onDelete={() => {
            setQs((xs) => xs.filter((_, j) => j !== i));
            setDirty(true);
          }}
          onDuplicate={() => {
            setQs((xs) => [...xs.slice(0, i + 1), { ...structuredClone(q), key: key() }, ...xs.slice(i + 1)]);
            setDirty(true);
          }}
          onSaveToBank={async () => {
            const r = await addToBankAction(subjectId, toPayload(q));
            if (r.ok) toast.success("Savollar bankiga qo‘shildi");
            else toast.error(r.error);
          }}
        />
      ))}

      <Card>
        <CardBody>
          <div className="mb-2 text-[13px] font-medium text-text-2">Savol qo‘shish</div>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((ty) => (
              <Button
                key={ty}
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQs((xs) => [...xs, blankQuestion(ty)]);
                  setDirty(true);
                }}
              >
                <Plus /> {t.questionType[ty]}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-pop backdrop-blur">
        <span className="pl-1 text-[12.5px] text-muted">{dirty ? "Saqlanmagan o‘zgarishlar bor" : "Barcha o‘zgarishlar saqlangan"}</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => save(false)} loading={pending} disabled={!qs.length}>
            <Save /> Saqlash
          </Button>
          {status !== "published" ? (
            <Button onClick={() => save(true)} loading={pending} disabled={!qs.length}>
              Saqlash va e’lon qilish
            </Button>
          ) : null}
        </div>
      </div>

      <CsvImportDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onImport={(list) => {
          setQs((xs) => [...xs, ...list.map((c) => ({ ...blankQuestion(c.type), ...c, key: key() }))]);
          setDirty(true);
          setCsvOpen(false);
          toast.success(`${list.length} ta savol qo‘shildi — saqlashni unutmang`);
        }}
      />

      <Dialog
        open={bankOpen}
        onClose={() => setBankOpen(false)}
        title="Savollar banki"
        description="Tanlangan savollar quizga nusxa sifatida qo‘shiladi (avval joriy o‘zgarishlarni saqlang)."
        footer={
          <>
            <Button variant="secondary" onClick={() => setBankOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              disabled={!picked.length}
              loading={pending}
              onClick={() =>
                start(async () => {
                  if (dirty) {
                    const s = await saveQuestionsAction(assignmentId, qs.map(toPayload));
                    if (!s.ok) return toast.error(s.error);
                  }
                  const r = await copyFromBankAction(assignmentId, picked);
                  if (r.ok) {
                    toast.success(`${picked.length} ta savol qo‘shildi`);
                    setBankOpen(false);
                    setPicked([]);
                    location.reload();
                  } else toast.error(r.error);
                })
              }
            >
              Qo‘shish ({picked.length})
            </Button>
          </>
        }
      >
        {bank.length ? (
          <ul className="max-h-[50dvh] space-y-1.5 overflow-y-auto">
            {bank.map((b) => (
              <li key={b.id}>
                <Checkbox
                  checked={picked.includes(b.id)}
                  onChange={(c) => setPicked((p) => (c ? [...p, b.id] : p.filter((x) => x !== b.id)))}
                  className="items-start rounded-xl border border-border p-3"
                  label={
                    <span>
                      <span className="line-clamp-2 font-medium">{b.prompt}</span>
                      <span className="text-[12px] text-muted">
                        {t.questionType[b.type as EditQuestion["type"]]} · {b.points} ball · {b.subjectName} · {b.ownerName}
                      </span>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-[13.5px] text-muted">Bu kategoriya bo‘yicha bankda savol yo‘q. Savol kartasidagi “Bankka” tugmasi orqali qo‘shing.</p>
        )}
      </Dialog>
    </div>
  );
}

const PROMPT_HINT: Partial<Record<QuestionType, string>> = {
  single_choice: "Masalan: Choose the correct form: She ___ to school every day.",
  translation: "Tarjima qilinadigan gap yoki so‘z.",
  grammar_correction: "Masalan: Find and correct the mistake.",
  arrange_words: "Masalan: Put the words in the correct order.",
  irregular_verb: "Masalan: Write the past forms of the verb.",
  essay: "Masalan: Write 80–100 words about your last holiday.",
};

export function QuestionCard({ q, index, count, onChange, onMove, onDelete, onDuplicate, onSaveToBank }: { q: EditQuestion; index: number; count: number; onChange: (p: Partial<EditQuestion>) => void; onMove?: (d: number) => void; onDelete?: () => void; onDuplicate?: () => void; onSaveToBank?: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [audioUp, setAudioUp] = useState(false);
  const blanks = q.type === "fill_blank" ? countBlanks(q.prompt) : 0;
  const isChoice = q.type === "single_choice" || q.type === "multiple_choice";
  return (
    <Card className="animate-fade-up">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-surface-2 text-[13px] font-semibold tabular">{index + 1}</span>
          <Badge tone="primary">{t.questionType[q.type]}</Badge>
        </div>
        {onMove && onDelete && onDuplicate && onSaveToBank ? (
          <div className="flex items-center [&_button]:size-8 sm:[&_button]:size-10">
            <Button variant="ghost" size="icon" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Yuqoriga">
              <ArrowUp />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Pastga">
              <ArrowDown />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDuplicate} aria-label="Nusxa">
              <Copy />
            </Button>
            <Button variant="ghost" size="icon" onClick={onSaveToBank} aria-label="Savollar bankiga saqlash" title="Bankka saqlash">
              <Library />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} aria-label="O‘chirish" className="hover:text-danger">
              <Trash2 />
            </Button>
          </div>
        ) : null}
      </div>
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <Field label="Savol matni" hint={q.type === "fill_blank" ? `Bo‘sh joylarni ___ bilan belgilang (topildi: ${blanks})` : PROMPT_HINT[q.type]}>
            <Textarea value={q.prompt} onChange={(e) => onChange({ prompt: e.target.value, ...(q.type === "fill_blank" ? { accepted: Array.from({ length: countBlanks(e.target.value) }, (_, i) => q.accepted[i] ?? []) } : {}) })} rows={3} />
          </Field>
          <Field label="Ball">
            <Input type="number" min={0} max={100} step="0.5" value={q.points} onChange={(e) => onChange({ points: Number(e.target.value) })} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {q.imageFileId ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${q.imageFileId}`} alt="" className="h-24 rounded-xl border border-border object-cover" />
              <button onClick={() => onChange({ imageFileId: null })} className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-text text-bg" aria-label="Rasmni olib tashlash">
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border-strong px-3 text-[13px] font-medium text-text-2 hover:border-primary hover:text-primary">
              <ImagePlus className="size-4" aria-hidden /> {uploading ? "Yuklanmoqda…" : "Rasm qo‘shish"}
              <input
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploading(true);
                  try {
                    onChange({ imageFileId: (await uploadFile(f, { imagesOnly: true })).id });
                  } catch (err) {
                    toast.error((err as Error).message);
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
          )}
          {q.audioFileId ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="min-w-0 flex-1"><AudioPlayer file={{ id: q.audioFileId, name: "Savol audiosi", size: 0 }} title="Savol audiosi" /></div>
              <Button variant="ghost" size="icon" onClick={() => onChange({ audioFileId: null })} aria-label="Audioni olib tashlash"><X /></Button>
            </div>
          ) : (
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border-strong px-3 text-[13px] font-medium text-text-2 hover:border-primary hover:text-primary">
              <Music className="size-4" aria-hidden /> {audioUp ? "Yuklanmoqda…" : "Audio qo‘shish"}
              <input
                type="file"
                hidden
                accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/webm,audio/aac"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setAudioUp(true);
                  try {
                    onChange({ audioFileId: (await uploadFile(f)).id });
                  } catch (err) {
                    toast.error((err as Error).message);
                  } finally {
                    setAudioUp(false);
                  }
                }}
              />
            </label>
          )}
        </div>

        {isChoice || q.type === "true_false" ? (
          <div className="space-y-2">
            <div className="text-[13px] font-medium text-text-2">Variantlar {q.type === "multiple_choice" ? "(bir nechta to‘g‘ri bo‘lishi mumkin)" : "(bitta to‘g‘ri)"}</div>
            {q.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ options: q.options.map((x, j) => (q.type === "multiple_choice" ? (j === i ? { ...x, isCorrect: !x.isCorrect } : x) : { ...x, isCorrect: j === i })) })}
                  className={cn("grid size-9 shrink-0 place-items-center border transition", q.type === "multiple_choice" ? "rounded-lg" : "rounded-full", o.isCorrect ? "border-success bg-success text-white" : "border-border-strong text-transparent hover:border-success")}
                  aria-label={o.isCorrect ? "To‘g‘ri javob" : "To‘g‘ri deb belgilash"}
                  aria-pressed={o.isCorrect}
                >
                  <Check className="size-4" strokeWidth={3} />
                </button>
                <Input value={o.label} disabled={q.type === "true_false"} onChange={(e) => onChange({ options: q.options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder={`${i + 1}-variant`} />
                {isChoice ? (
                  <Button variant="ghost" size="icon" onClick={() => onChange({ options: q.options.filter((_, j) => j !== i) })} disabled={q.options.length <= 2} aria-label="Variantni o‘chirish">
                    <X />
                  </Button>
                ) : null}
              </div>
            ))}
            {isChoice && q.options.length < 10 ? (
              <Button variant="ghost" size="sm" onClick={() => onChange({ options: [...q.options, { label: "", isCorrect: false }] })}>
                <Plus /> Variant
              </Button>
            ) : null}
          </div>
        ) : null}

        {q.type === "short_answer" ? (
          <Field label="Qabul qilinadigan javoblar" hint="Har birini yangi qatorga yozing. Bo‘sh qoldirsangiz — o‘qituvchi qo‘lda baholaydi.">
            <Textarea rows={3} value={(q.accepted[0] ?? []).join("\n")} onChange={(e) => onChange({ accepted: [e.target.value.split("\n")] })} />
          </Field>
        ) : null}
        {q.type === "fill_blank" && blanks > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: blanks }).map((_, i) => (
              <Field key={i} label={`${i + 1}-bo‘sh joy javoblari`} hint="Vergul bilan ajrating">
                <Input value={(q.accepted[i] ?? []).join(", ")} onChange={(e) => onChange({ accepted: Array.from({ length: blanks }, (_, j) => (j === i ? e.target.value.split(",") : (q.accepted[j] ?? []))) })} />
              </Field>
            ))}
          </div>
        ) : null}
        {q.type === "short_answer" || q.type === "fill_blank" ? <Checkbox checked={q.caseSensitive} onChange={(c) => onChange({ caseSensitive: c })} label="Katta-kichik harfni farqlash" /> : null}

        {q.type === "matching" ? (
          <div className="space-y-2">
            <div className="text-[13px] font-medium text-text-2">Juftliklar (o‘quvchiga o‘ng ustun aralashtirib ko‘rsatiladi)</div>
            {q.pairs.map((pr, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input value={pr.left} onChange={(e) => onChange({ pairs: q.pairs.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)) })} placeholder="Chap" aria-label="Chap tomon" />
                <Input value={pr.right} onChange={(e) => onChange({ pairs: q.pairs.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)) })} placeholder="O‘ng" aria-label="O‘ng tomon" />
                <Button variant="ghost" size="icon" onClick={() => onChange({ pairs: q.pairs.filter((_, j) => j !== i) })} disabled={q.pairs.length <= 2} aria-label="Juftlikni o‘chirish">
                  <X />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => onChange({ pairs: [...q.pairs, { left: "", right: "" }] })}>
              <Plus /> Juftlik
            </Button>
          </div>
        ) : null}

        {q.type === "translation" ? (
          <div className="space-y-3">
            <Field label="Yo‘nalish">
              <Select value={q.direction ?? "en_uz"} onChange={(e) => onChange({ direction: e.target.value as "en_uz" | "uz_en" })}>
                <option value="en_uz">Inglizchadan o‘zbekchaga</option>
                <option value="uz_en">O‘zbekchadan inglizchaga</option>
              </Select>
            </Field>
            <Field label="To‘g‘ri tarjimalar" hint="Har birini yangi qatorga yozing. Bo‘sh qoldirsangiz — ustoz qo‘lda baholaydi.">
              <Textarea rows={3} value={(q.accepted[0] ?? []).join("\n")} onChange={(e) => onChange({ accepted: [e.target.value.split("\n")] })} />
            </Field>
          </div>
        ) : null}

        {q.type === "grammar_correction" ? (
          <div className="space-y-3">
            <Field label="Xatosi bor gap" hint="O‘quvchiga shu gap tahrirlash uchun beriladi.">
              <Input value={q.incorrect} onChange={(e) => onChange({ incorrect: e.target.value })} placeholder="She don't like coffee." />
            </Field>
            <Field label="To‘g‘ri variantlar" hint="Har birini yangi qatorga yozing.">
              <Textarea rows={2} value={(q.accepted[0] ?? []).join("\n")} onChange={(e) => onChange({ accepted: [e.target.value.split("\n")] })} placeholder="She doesn't like coffee." />
            </Field>
          </div>
        ) : null}

        {q.type === "arrange_words" ? (
          <div className="space-y-3">
            <Field label="To‘g‘ri gap" hint={`O‘quvchiga so‘zlar aralashtirib beriladi (${q.words.length} ta so‘z).`}>
              <Input value={q.words.join(" ")} onChange={(e) => onChange({ words: e.target.value.split(/\s+/) })} placeholder="I have never been to London" />
            </Field>
            <Field label="Boshqa to‘g‘ri tartiblar (ixtiyoriy)" hint="Har birini yangi qatorga yozing.">
              <Textarea rows={2} value={(q.accepted[0] ?? []).join("\n")} onChange={(e) => onChange({ accepted: [e.target.value.split("\n")] })} />
            </Field>
          </div>
        ) : null}

        {q.type === "irregular_verb" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Asosiy shakl (V1)">
              <Input value={q.base} onChange={(e) => onChange({ base: e.target.value })} placeholder="go" />
            </Field>
            <Field label="Past Simple (V2)" hint="Vergul bilan: was, were">
              <Input value={(q.accepted[0] ?? []).join(", ")} onChange={(e) => onChange({ accepted: [e.target.value.split(","), q.accepted[1] ?? []] })} placeholder="went" />
            </Field>
            <Field label="Past Participle (V3)" hint="Vergul bilan">
              <Input value={(q.accepted[1] ?? []).join(", ")} onChange={(e) => onChange({ accepted: [q.accepted[0] ?? [], e.target.value.split(",")] })} placeholder="gone" />
            </Field>
          </div>
        ) : null}

        {q.type === "essay" ? <p className="text-[12.5px] text-muted">Erkin javoblar o‘qituvchi tomonidan qo‘lda baholanadi.</p> : null}

        <Field label="Tushuntirish (natijada ko‘rsatiladi)">
          <Textarea rows={2} value={q.explanation} onChange={(e) => onChange({ explanation: e.target.value })} />
        </Field>
      </CardBody>
    </Card>
  );
}

export function QuestionTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(t.questionType).map(([k, l]) => (
        <option key={k} value={k}>
          {l}
        </option>
      ))}
    </Select>
  );
}

function CsvImportDialog({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (q: CsvQuestion[]) => void }) {
  const [text, setText] = useState("");
  const parsed = text.trim() ? parseQuestionCsv(text) : null;
  const template = () => {
    const url = URL.createObjectURL(new Blob(["\ufeff" + QUESTION_CSV_EXAMPLE], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "savollar-namuna.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Savollarni CSV’dan import qilish"
      description="Ustunlar: type, prompt, points, options, answers, extra, explanation. Namunani yuklab, to‘ldiring."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Bekor qilish</Button>
          <Button disabled={!parsed || !parsed.questions.length || parsed.errors.length > 0} onClick={() => parsed && onImport(parsed.questions)}>
            Qo‘shish{parsed?.questions.length ? ` (${parsed.questions.length})` : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={template}><Download /> Namuna CSV</Button>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[13px] font-medium hover:bg-surface-2">
            <FileUp className="size-4" aria-hidden /> Fayl tanlash
            <input type="file" accept=".csv,text/csv" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setText(await f.text()); }} />
          </label>
        </div>
        <Textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={QUESTION_CSV_EXAMPLE.split("\n").slice(0, 3).join("\n")} aria-label="CSV matni" className="font-mono text-[12.5px]" spellCheck={false} />
        {parsed ? (
          parsed.errors.length ? (
            <Alert tone="danger" title={`${parsed.errors.length} ta xato — tuzatib qayta urining`}>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto text-[12.5px]">
                {parsed.errors.map((e, i) => <li key={i}>{e.line}-qator: {e.message}</li>)}
              </ul>
            </Alert>
          ) : (
            <Alert tone="success">{parsed.questions.length} ta savol tayyor.</Alert>
          )
        ) : null}
      </div>
    </Dialog>
  );
}
