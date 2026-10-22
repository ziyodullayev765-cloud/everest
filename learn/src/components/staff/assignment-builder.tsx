"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Headphones, ListTodo, Wand2, BookOpen, Dumbbell, FileText, FileUp, Link2, ListChecks, Plus, Save, Search, Send, Timer, Trash2, Users, CalendarClock, Scale, Settings2, CheckSquare } from "lucide-react";
import { saveAssignmentAction } from "@/app/actions/staff";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Switch, Textarea, Checkbox } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";
import { Uploader, type UploadedFile } from "@/components/app/uploader";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { GRAMMAR_TOPICS, LEVELS } from "@/lib/course";
import { tr } from "@/lib/i18n/tr";

const QUIZ = ["multiple_choice", "short_answer", "true_false", "timed_quiz", "practice"];
const TYPES = [
  { k: "homework", icon: ListTodo, get d() { return tr("Bir nechta topshiriq"); } },
  { k: "written", icon: FileText, get d() { return tr("Matnli javob"); } },
  { k: "file_upload", icon: FileUp, get d() { return tr("Fayl topshirish"); } },
  { k: "multiple_choice", icon: ListChecks, get d() { return tr("Variantli test"); } },
  { k: "short_answer", icon: ListChecks, get d() { return tr("Qisqa javoblar"); } },
  { k: "true_false", icon: CheckSquare, get d() { return tr("Ha / yo‘q savollar"); } },
  { k: "timed_quiz", icon: Timer, get d() { return tr("Vaqt chegarali"); } },
  { k: "practice", icon: Dumbbell, get d() { return tr("Baholanmaydi"); } },
  { k: "material", icon: BookOpen, get d() { return tr("O‘qish uchun"); } },
] as const;

export type BuilderValue = {
  title: string;
  description: string;
  instructions: string;
  type: string;
  subjectId: string;
  dueAt: string;
  publishMode: "draft" | "now" | "schedule";
  publishAt: string;
  maxScore: number;
  allowLate: boolean;
  latePenaltyPercent: number;
  lateCutoffAt: string;
  allowResubmission: boolean;
  maxResubmissions: number;
  timeLimitMinutes: number | "";
  maxAttempts: number;
  passingPercent: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  allowBackNavigation: boolean;
  showOverview: boolean;
  reviewMode: "never" | "after_submit" | "after_due" | "after_grading";
  showCorrectAnswers: boolean;
  links: { title: string; url: string }[];
  rubric: { id: string; title: string; description?: string; maxPoints: number }[];
  classIds: string[];
  studentIds: string[];
  items: { id: string; kind: HomeworkKind; title: string; bookId?: string | null; range?: string; note?: string }[];
  level: string;
  topic: string;
  passage: string;
  audioFileId: string | null;
  transcript: string;
  transcriptMode: "never" | "after_submit" | "always";
  replayLimit: number | "";
};

type HomeworkKind = "reading" | "vocabulary" | "listening" | "translation" | "tapescript" | "writing" | "other";
const KINDS: HomeworkKind[] = ["reading", "vocabulary", "listening", "translation", "tapescript", "writing", "other"];
const newId = () => Math.random().toString(36).slice(2, 10);
/** The centre's usual homework, as a one-click starting point. */
const TEMPLATE: Omit<BuilderValue["items"][number], "id">[] = [
  { kind: "reading", get title() { return tr("Barron's Reading"); }, get range() { return tr("Passage 1-2"); } },
  { kind: "vocabulary", get title() { return tr("B2 unit — so‘zlarni yodlash"); }, range: "" },
  { kind: "listening", get title() { return tr("Basic Listening"); }, range: "18-betgacha" },
  { kind: "translation", get title() { return tr("Text translation"); }, range: "" },
  { kind: "tapescript", get title() { return tr("BBC tapescript yozish"); }, range: "" },
];

type Props = {
  base: string;
  id: string | null;
  initial: BuilderValue;
  initialAttachments: UploadedFile[];
  initialAudio: UploadedFile | null;
  status: string | null;
  subjects: { id: string; name: string; code: string }[];
  classes: { id: string; name: string; students: number }[];
  students: { id: string; displayName: string; className: string }[];
  books: { id: string; title: string; category: string }[];
  hasWork: boolean;
};

export function AssignmentBuilder(p: Props) {
  const [v, setV] = useState<BuilderValue>(p.initial);
  const [files, setFiles] = useState<UploadedFile[]>(p.initialAttachments);
  const [audio, setAudio] = useState<UploadedFile[]>(p.initialAudio ? [p.initialAudio] : []);
  const code = p.subjects.find((s) => s.id === v.subjectId)?.code;
  const [showReading, setShowReading] = useState(!!p.initial.passage);
  const [showListening, setShowListening] = useState(!!p.initial.audioFileId || !!p.initial.transcript);
  const reading = showReading || code === "READING";
  const listening = showListening || code === "LISTENING";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [studentQ, setStudentQ] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof BuilderValue>(k: K, val: BuilderValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const isQuiz = QUIZ.includes(v.type);
  const isWork = v.type === "written" || v.type === "file_upload" || v.type === "homework";
  const live = p.status === "published";
  const rubricSum = v.rubric.reduce((s, c) => s + Number(c.maxPoints || 0), 0);

  const filteredStudents = useMemo(() => {
    const q = studentQ.trim().toLowerCase();
    return p.students.filter((s) => !q || s.displayName.toLowerCase().includes(q) || s.className.toLowerCase().includes(q)).slice(0, 50);
  }, [studentQ, p.students]);

  const submit = (mode: BuilderValue["publishMode"]) =>
    start(async () => {
      setErrors({});
      setFormError(null);
      const payload = {
        ...v,
        publishMode: live ? "now" : mode,
        timeLimitMinutes: v.timeLimitMinutes === "" ? null : v.timeLimitMinutes,
        replayLimit: v.replayLimit === "" ? null : v.replayLimit,
        audioFileId: audio[0]?.id ?? null,
        attachmentFileIds: files.map((f) => f.id),
      };
      const r = await saveAssignmentAction(p.id, payload);
      if (!r.ok) {
        setErrors(r.fields ?? {});
        setFormError(r.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (r.data.keptDraft) toast.info(tr("Saqlandi. Quizni e’lon qilish uchun avval savollar qo‘shing."));
      else toast.success(mode === "draft" && !live ? tr("Qoralama saqlandi") : mode === "schedule" ? tr("Rejalashtirildi") : tr("Saqlandi va e’lon qilindi"));
      if (!p.id || isQuiz) router.push(`${p.base}/assignments/${r.data.id}${isQuiz ? "?tab=questions" : ""}`);
      else router.refresh();
    });

  return (
    <div className="space-y-5">
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      {live ? <Alert tone="info">{tr("Bu vazifa e’lon qilingan. O‘zgarishlar darhol o‘quvchilarga ko‘rinadi.")}</Alert> : null}

      <Card>
        <CardHeader title={tr("Asosiy ma’lumot")} icon={<FileText />} />
        <CardBody className="space-y-5">
          <Field label={tr("Sarlavha")} htmlFor="title" required error={errors.title}>
            <Input id="title" value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder={tr("Masalan: Present Perfect — mashqlar")} />
          </Field>
          <div>
            <div className="mb-2 text-[13px] font-semibold text-text-2">{tr("Turi")}</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TYPES.map(({ k, icon: Icon, d }) => (
                <button
                  key={k}
                  type="button"
                  disabled={p.hasWork && v.type !== k}
                  onClick={() => set("type", k)}
                  className={cn("flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition disabled:opacity-40", v.type === k ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-border hover:bg-surface-2")}
                  aria-pressed={v.type === k}
                >
                  <Icon className={cn("size-4", v.type === k ? "text-primary" : "text-muted")} aria-hidden />
                  <span className="text-[13px] font-bold">{t.assignmentType[k]}</span>
                  <span className="text-[11.5px] text-muted">{d}</span>
                </button>
              ))}
            </div>
            {p.hasWork ? <p className="mt-2 text-[12px] text-muted">{tr("O‘quvchilar ishlay boshlagani uchun turini o‘zgartirib bo‘lmaydi.")}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={tr("Kategoriya")} htmlFor="subject" required error={errors.subjectId}>
              <Select id="subject" value={v.subjectId} onChange={(e) => set("subjectId", e.target.value)}>
                <option value="">{tr("Tanlang…")}</option>
                {p.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tr("Daraja")} htmlFor="level" error={errors.level}>
              <Input id="level" value={v.level} onChange={(e) => set("level", e.target.value)} list="asg-levels" placeholder="B1" maxLength={40} />
            </Field>
            <Field label={tr("Mavzu")} htmlFor="topic" hint={code === "GRAMMAR" ? tr("Grammatika bo‘limida shu mavzu ostida chiqadi") : undefined} error={errors.topic}>
              <Input id="topic" value={v.topic} onChange={(e) => set("topic", e.target.value)} list="asg-topics" placeholder={tr("Present Perfect")} maxLength={120} />
            </Field>
            <datalist id="asg-levels">{LEVELS.map((l) => <option key={l} value={l} />)}</datalist>
            <datalist id="asg-topics">{GRAMMAR_TOPICS.map((l) => <option key={l} value={l} />)}</datalist>
          </div>
          <Field label={tr("Qisqa tavsif")} htmlFor="desc" error={errors.description}>
            <Textarea id="desc" value={v.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={5000} />
          </Field>
          <Field label={tr("Ko‘rsatmalar")} htmlFor="instr" hint={tr("Havolalar avtomatik bosiladigan bo‘ladi. Grammatika uchun qoida va misollarni shu yerga yozing.")} error={errors.instructions}>
            <Textarea id="instr" value={v.instructions} onChange={(e) => set("instructions", e.target.value)} rows={7} maxLength={20000} />
          </Field>
        </CardBody>
      </Card>

      {v.type === "homework" ? (
        <Card>
          <CardHeader
            title={tr("Topshiriqlar")}
            icon={<ListTodo />}
            description={tr("O‘quvchi har birini alohida belgilaydi. Tarjima va tapescript uchun matn yozadi.")}
            action={
              <Button variant="secondary" size="sm" onClick={() => set("items", [...v.items, ...TEMPLATE.map((x) => ({ ...x, id: newId() }))])}>
                <Wand2 /> {tr("Namuna")}
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {errors.items ? <p className="text-[12.5px] text-danger">{errors.items}</p> : null}
            {v.items.map((it, i) => {
              const upd = (patch: Partial<BuilderValue["items"][number]>) => set("items", v.items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={it.id} className="space-y-2 rounded-xl border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-[12.5px] font-bold tabular">{i + 1}</span>
                    <Select value={it.kind} onChange={(e) => upd({ kind: e.target.value as HomeworkKind })} aria-label={tr("Turi")} className="h-9">
                      {KINDS.map((k) => (
                        <option key={k} value={k}>
                          {t.homeworkKind[k]}
                        </option>
                      ))}
                    </Select>
                    <div className="ml-auto flex shrink-0">
                      <Button variant="ghost" size="icon" className="size-8" disabled={i === 0} onClick={() => { const n = [...v.items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; set("items", n); }} aria-label={tr("Yuqoriga")}><ArrowUp /></Button>
                      <Button variant="ghost" size="icon" className="size-8" disabled={i === v.items.length - 1} onClick={() => { const n = [...v.items]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; set("items", n); }} aria-label={tr("Pastga")}><ArrowDown /></Button>
                      <Button variant="ghost" size="icon" className="size-8 hover:text-danger" onClick={() => set("items", v.items.filter((_, j) => j !== i))} aria-label={tr("O‘chirish")}><Trash2 /></Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
                    <Input value={it.title} onChange={(e) => upd({ title: e.target.value })} placeholder={tr("Masalan: Barron's Reading")} aria-label={tr("Topshiriq nomi")} maxLength={200} />
                    <Input value={it.range ?? ""} onChange={(e) => upd({ range: e.target.value })} placeholder={tr("Passage 1-2 / 18-betgacha")} aria-label={tr("Oraliq")} maxLength={120} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
                    <Select value={it.bookId ?? ""} onChange={(e) => { const b = p.books.find((x) => x.id === e.target.value); upd({ bookId: e.target.value || null, ...(b && !it.title.trim() ? { title: b.title } : {}) }); }} aria-label={tr("Kitob")}>
                      <option value="">{tr("Kitob biriktirilmagan")}</option>
                      {p.books.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title}
                        </option>
                      ))}
                    </Select>
                    <Input value={it.note ?? ""} onChange={(e) => upd({ note: e.target.value })} placeholder={tr("Izoh (ixtiyoriy)")} aria-label={tr("Izoh")} maxLength={2000} />
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-2">
              {KINDS.slice(0, 6).map((k) => (
                <Button key={k} variant="secondary" size="sm" onClick={() => set("items", [...v.items, { id: newId(), kind: k, title: "", range: "" }])}>
                  <Plus /> {t.homeworkKind[k]}
                </Button>
              ))}
            </div>
            {!p.books.length ? <p className="text-[12.5px] text-muted">{tr("Kitob biriktirish uchun avval Admin → Kutubxona bo‘limiga kitob qo‘shing.")}</p> : null}
          </CardBody>
        </Card>
      ) : null}

      {reading ? (
        <Card>
          <CardHeader title={tr("Reading matni")} icon={<BookOpen />} description={tr("O‘quvchi savollardan oldin shu matnni o‘qiydi.")} />
          <CardBody>
            <Field label={tr("Matn")} htmlFor="passage" error={errors.passage}>
              <Textarea id="passage" value={v.passage} onChange={(e) => set("passage", e.target.value)} rows={10} maxLength={20000} placeholder={tr("English text…")} spellCheck={false} />
            </Field>
          </CardBody>
        </Card>
      ) : null}

      {listening ? (
        <Card>
          <CardHeader title={tr("Listening")} icon={<Headphones />} description={tr("Audio, tinglash soni va transkript.")} />
          <CardBody className="space-y-4">
            <Uploader files={audio} onChange={setAudio} max={1} accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/webm,audio/aac" label={tr("Audio fayl")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr("Tinglash chegarasi")} htmlFor="replay" hint={tr("Bo‘sh — cheksiz. Brauzerda hisoblanadi.")}>
                <Input id="replay" type="number" min={1} max={20} value={v.replayLimit} onChange={(e) => set("replayLimit", e.target.value === "" ? "" : Number(e.target.value))} />
              </Field>
              <Field label={tr("Transkript ko‘rinishi")} htmlFor="tmode">
                <Select id="tmode" value={v.transcriptMode} onChange={(e) => set("transcriptMode", e.target.value as BuilderValue["transcriptMode"])}>
                  <option value="after_submit">{tr("Topshirgandan keyin")}</option>
                  <option value="always">{tr("Doim ko‘rinadi")}</option>
                  <option value="never">{tr("Ko‘rsatilmaydi")}</option>
                </Select>
              </Field>
            </div>
            <Field label={tr("Transkript")} htmlFor="transcript">
              <Textarea id="transcript" value={v.transcript} onChange={(e) => set("transcript", e.target.value)} rows={6} maxLength={20000} spellCheck={false} />
            </Field>
          </CardBody>
        </Card>
      ) : null}

      {!reading || !listening ? (
        <div className="flex flex-wrap gap-2">
          {!reading ? <Button variant="secondary" size="sm" onClick={() => setShowReading(true)}><Plus /> {tr("Reading matni")}</Button> : null}
          {!listening ? <Button variant="secondary" size="sm" onClick={() => setShowListening(true)}><Plus /> {tr("Listening audio")}</Button> : null}
        </div>
      ) : null}

      <Card>
        <CardHeader title={tr("Materiallar")} icon={<Link2 />} description={tr("Doska rasmi, audio yozuvlar, fayllar. Faqat shu vazifani ko‘ra oladiganlarga ochiladi.")} />
        <CardBody className="space-y-4">
          <Uploader files={files} onChange={setFiles} max={30} label={tr("Doska rasmi, audio yoki fayl biriktirish")} />
          <div className="space-y-2">
            {v.links.map((l, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                <Input value={l.title} onChange={(e) => set("links", v.links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder={tr("Havola nomi")} aria-label={tr("Havola nomi")} />
                <Input value={l.url} onChange={(e) => set("links", v.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://…" inputMode="url" aria-label="URL" />
                <Button variant="ghost" size="icon" onClick={() => set("links", v.links.filter((_, j) => j !== i))} aria-label={tr("Havolani o‘chirish")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {errors["links.0.url"] || errors["links"] ? <p className="text-[12.5px] text-danger">{errors["links.0.url"] ?? errors.links}</p> : null}
            <Button variant="secondary" size="sm" onClick={() => set("links", [...v.links, { title: "", url: "" }])}>
              <Plus /> {tr("Havola qo‘shish")}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={tr("Kimlar uchun")} icon={<Users />} description={tr("Guruhlar va/yoki alohida o‘quvchilar")} />
        <CardBody className="space-y-4">
          {errors.classIds ? <p className="text-[12.5px] text-danger">{errors.classIds}</p> : null}
          <div className="grid gap-2 sm:grid-cols-3">
            {p.classes.map((c) => (
              <label key={c.id} className={cn("flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-[14px]", v.classIds.includes(c.id) ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2")}>
                <span className="flex items-center gap-2.5">
                  <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={v.classIds.includes(c.id)} onChange={(e) => set("classIds", e.target.checked ? [...v.classIds, c.id] : v.classIds.filter((x) => x !== c.id))} />
                  <span className="font-semibold">{c.name}</span>
                </span>
                <span className="text-[12px] text-muted">{tr("{0} o‘q.", c.students)}</span>
              </label>
            ))}
            {!p.classes.length ? <p className="text-[13px] text-muted">{tr("Sizga biriktirilgan guruh yo‘q.")}</p> : null}
          </div>
          <details className="rounded-xl border border-border px-4 py-3" open={v.studentIds.length > 0}>
            <summary className="cursor-pointer text-[13.5px] font-semibold">{tr("Alohida o‘quvchilar ({0})", v.studentIds.length)}</summary>
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <Input value={studentQ} onChange={(e) => setStudentQ(e.target.value)} placeholder={tr("Ism yoki guruh bo‘yicha qidirish")} className="pl-9" />
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {filteredStudents.map((s) => (
                  <Checkbox key={s.id} className="rounded-lg px-2 py-1.5 hover:bg-surface-2" checked={v.studentIds.includes(s.id)} onChange={(c) => set("studentIds", c ? [...v.studentIds, s.id] : v.studentIds.filter((x) => x !== s.id))} label={<>{s.displayName} <span className="text-muted">· {s.className || "guruhsiz"}</span></>} />
                ))}
              </div>
            </div>
          </details>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={tr("Muddat va qoidalar")} icon={<CalendarClock />} description={tr("Vaqtlar Toshkent vaqti bo‘yicha")} />
        <CardBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr("Topshirish muddati")} htmlFor="due" hint={tr("Bo‘sh qoldirsangiz — muddatsiz")} error={errors.dueAt}>
              <Input id="due" type="datetime-local" value={v.dueAt} onChange={(e) => set("dueAt", e.target.value)} />
            </Field>
            {!isQuiz && v.type !== "material" ? (
              <Field label={tr("Maksimal ball")} htmlFor="max" error={errors.maxScore}>
                <Input id="max" type="number" min={1} max={1000} step="0.5" value={v.maxScore} onChange={(e) => set("maxScore", Number(e.target.value))} />
              </Field>
            ) : isQuiz ? (
              <Field label={tr("Maksimal ball")} hint={tr("Savollar ballari yig‘indisidan avtomatik hisoblanadi")}>
                <Input value={`${v.maxScore}`} disabled />
              </Field>
            ) : null}
          </div>
          {v.type !== "material" ? (
            <div className="space-y-3 rounded-xl bg-surface-2/60 p-4">
              <Switch checked={v.allowLate} onChange={(x) => set("allowLate", x)} label={tr("Kechikib topshirishga ruxsat")} description={tr("Muddatdan keyin ham qabul qilinadi va “kechikkan” deb belgilanadi")} />
              {v.allowLate ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={tr("Kechikish jarimasi, %")} htmlFor="pen" hint={tr("Maksimal balldan ayiriladi")}>
                    <Input id="pen" type="number" min={0} max={100} value={v.latePenaltyPercent} onChange={(e) => set("latePenaltyPercent", Number(e.target.value))} />
                  </Field>
                  <Field label={tr("Oxirgi chegara (ixtiyoriy)")} htmlFor="cut" error={errors.lateCutoffAt}>
                    <Input id="cut" type="datetime-local" value={v.lateCutoffAt} onChange={(e) => set("lateCutoffAt", e.target.value)} />
                  </Field>
                </div>
              ) : null}
              {isWork ? (
                <>
                  <Switch checked={v.allowResubmission} onChange={(x) => set("allowResubmission", x)} label={tr("Qayta topshirishga ruxsat")} description={tr("Yakuniy baho qo‘yilgunga qadar")} />
                  {v.allowResubmission ? (
                    <Field label={tr("Necha marta qayta topshirish mumkin")} htmlFor="resub" className="max-w-xs">
                      <Input id="resub" type="number" min={1} max={10} value={v.maxResubmissions || 1} onChange={(e) => set("maxResubmissions", Number(e.target.value))} />
                    </Field>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </CardBody>
      </Card>

      {isQuiz ? (
        <Card>
          <CardHeader title={tr("Quiz sozlamalari")} icon={<Settings2 />} />
          <CardBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={tr("Vaqt chegarasi, daqiqa")} htmlFor="tl" hint={v.type === "timed_quiz" ? tr("Majburiy") : tr("Bo‘sh — cheklanmagan")}>
                <Input id="tl" type="number" min={1} max={600} value={v.timeLimitMinutes} onChange={(e) => set("timeLimitMinutes", e.target.value === "" ? "" : Number(e.target.value))} />
              </Field>
              <Field label={tr("Urinishlar soni")} htmlFor="att">
                <Input id="att" type="number" min={1} max={20} value={v.maxAttempts} onChange={(e) => set("maxAttempts", Number(e.target.value))} />
              </Field>
              <Field label={tr("O‘tish bali, %")} htmlFor="pass">
                <Input id="pass" type="number" min={0} max={100} value={v.passingPercent} onChange={(e) => set("passingPercent", Number(e.target.value))} />
              </Field>
            </div>
            <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              <Switch checked={v.shuffleQuestions} onChange={(x) => set("shuffleQuestions", x)} label={tr("Savollarni aralashtirish")} />
              <Switch checked={v.shuffleOptions} onChange={(x) => set("shuffleOptions", x)} label={tr("Variantlarni aralashtirish")} />
              <Switch checked={v.allowBackNavigation} onChange={(x) => set("allowBackNavigation", x)} label={tr("Oldingi savolga qaytish")} />
              <Switch checked={v.showOverview} onChange={(x) => set("showOverview", x)} label={tr("Savollar ro‘yxatini ko‘rsatish")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr("Natijalarni ko‘rish")} htmlFor="rev">
                <Select id="rev" value={v.reviewMode} onChange={(e) => set("reviewMode", e.target.value as BuilderValue["reviewMode"])}>
                  <option value="after_submit">{tr("Topshirgandan so‘ng")}</option>
                  <option value="after_due">{tr("Muddat tugagandan so‘ng")}</option>
                  <option value="after_grading">{tr("To‘liq baholangandan so‘ng")}</option>
                  <option value="never">{tr("Ko‘rsatmaslik")}</option>
                </Select>
              </Field>
              <div className="pt-6">
                <Switch checked={v.showCorrectAnswers} onChange={(x) => set("showCorrectAnswers", x)} label={tr("To‘g‘ri javoblarni ko‘rsatish")} disabled={v.reviewMode === "never"} />
              </div>
            </div>
            {v.type === "practice" ? <Alert tone="info">{tr("Mashqlar rasmiy baho yaratmaydi. Urinishlar soni kamida 5 ta bo‘ladi.")}</Alert> : null}
          </CardBody>
        </Card>
      ) : null}

      {isWork ? (
        <Card>
          <CardHeader title={tr("Baholash mezonlari (ixtiyoriy)")} icon={<Scale />} description={v.rubric.length ? tr("Yig‘indi: {0} / {1} ball", rubricSum, v.maxScore) : tr("Rubrika qo‘shsangiz, baho mezonlar yig‘indisidan hisoblanadi")} />
          <CardBody className="space-y-2">
            {v.rubric.map((c, i) => (
              <div key={c.id} className="grid gap-2 sm:grid-cols-[1.2fr_1.5fr_110px_auto]">
                <Input value={c.title} onChange={(e) => set("rubric", v.rubric.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder={tr("Mezon")} aria-label={tr("Mezon nomi")} />
                <Input value={c.description ?? ""} onChange={(e) => set("rubric", v.rubric.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} placeholder={tr("Tavsif (ixtiyoriy)")} aria-label={tr("Tavsif")} />
                <Input type="number" min={0.5} step="0.5" value={c.maxPoints} onChange={(e) => set("rubric", v.rubric.map((x, j) => (j === i ? { ...x, maxPoints: Number(e.target.value) } : x)))} aria-label={tr("Ball")} />
                <Button variant="ghost" size="icon" onClick={() => set("rubric", v.rubric.filter((_, j) => j !== i))} aria-label={tr("Mezonni o‘chirish")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {errors.rubric ? <p className="text-[12.5px] text-danger">{errors.rubric}</p> : null}
            <Button variant="secondary" size="sm" onClick={() => set("rubric", [...v.rubric, { id: Math.random().toString(36).slice(2, 10), title: "", maxPoints: 1 }])}>
              <Plus /> {tr("Mezon qo‘shish")}
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {!live ? (
        <Card>
          <CardHeader title={tr("E’lon qilish")} icon={<Send />} />
          <CardBody className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["draft", tr("Qoralama"), tr("Faqat siz ko‘rasiz")],
                  ["now", tr("Hozir e’lon qilish"), tr("O‘quvchilarga darhol ko‘rinadi")],
                  ["schedule", tr("Rejalashtirish"), tr("Belgilangan vaqtda")],
                ] as const
              ).map(([k, l, d]) => (
                <button key={k} type="button" onClick={() => set("publishMode", k)} className={cn("rounded-xl border p-3 text-left", v.publishMode === k ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-border hover:bg-surface-2")} aria-pressed={v.publishMode === k}>
                  <div className="text-[13.5px] font-bold">{l}</div>
                  <div className="text-[12px] text-muted">{d}</div>
                </button>
              ))}
            </div>
            {v.publishMode === "schedule" ? (
              <Field label={tr("E’lon qilish vaqti")} htmlFor="pub" error={errors.publishAt} className="max-w-xs">
                <Input id="pub" type="datetime-local" value={v.publishAt} onChange={(e) => set("publishAt", e.target.value)} />
              </Field>
            ) : null}
            {isQuiz && !p.id && v.publishMode !== "draft" ? <p className="text-[12.5px] text-muted">{tr("Quiz avval qoralama sifatida saqlanadi — keyingi bosqichda savollar qo‘shib, e’lon qilasiz.")}</p> : null}
          </CardBody>
        </Card>
      ) : null}

      <div className="sticky bottom-4 z-10 flex flex-wrap justify-end gap-2 rounded-3xl border-2 border-border bg-surface/95 p-3 shadow-pop backdrop-blur">
        {!live ? (
          <Button variant="secondary" onClick={() => submit("draft")} loading={pending}>
            <Save /> {tr("Qoralama")}
          </Button>
        ) : null}
        <Button onClick={() => submit(live ? "now" : isQuiz && !p.id ? "draft" : v.publishMode)} loading={pending}>
          <Send /> {live ? tr("O‘zgarishlarni saqlash") : isQuiz && !p.id ? tr("Saqlash va savollarga o‘tish") : v.publishMode === "now" ? tr("E’lon qilish") : v.publishMode === "schedule" ? tr("Rejalashtirish") : tr("Saqlash")}
        </Button>
      </div>
    </div>
  );
}
