"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Dumbbell, FileText, FileUp, Link2, ListChecks, Plus, Save, Search, Send, Timer, Trash2, Users, CalendarClock, Scale, Settings2, CheckSquare } from "lucide-react";
import { saveAssignmentAction } from "@/app/actions/staff";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Switch, Textarea, Checkbox } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";
import { Uploader, type UploadedFile } from "@/components/app/uploader";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const QUIZ = ["multiple_choice", "short_answer", "true_false", "timed_quiz", "practice"];
const TYPES = [
  { k: "written", icon: FileText, d: "Matnli javob" },
  { k: "file_upload", icon: FileUp, d: "Fayl topshirish" },
  { k: "multiple_choice", icon: ListChecks, d: "Variantli test" },
  { k: "short_answer", icon: ListChecks, d: "Qisqa javoblar" },
  { k: "true_false", icon: CheckSquare, d: "Ha / yo‘q savollar" },
  { k: "timed_quiz", icon: Timer, d: "Vaqt chegarali" },
  { k: "practice", icon: Dumbbell, d: "Baholanmaydi" },
  { k: "material", icon: BookOpen, d: "O‘qish uchun" },
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
};

type Props = {
  base: string;
  id: string | null;
  initial: BuilderValue;
  initialAttachments: UploadedFile[];
  status: string | null;
  subjects: { id: string; name: string }[];
  classes: { id: string; name: string; students: number }[];
  students: { id: string; displayName: string; className: string }[];
  hasWork: boolean;
};

export function AssignmentBuilder(p: Props) {
  const [v, setV] = useState<BuilderValue>(p.initial);
  const [files, setFiles] = useState<UploadedFile[]>(p.initialAttachments);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [studentQ, setStudentQ] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof BuilderValue>(k: K, val: BuilderValue[K]) => setV((x) => ({ ...x, [k]: val }));
  const isQuiz = QUIZ.includes(v.type);
  const isWork = v.type === "written" || v.type === "file_upload";
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
      const payload = { ...v, publishMode: live ? "now" : mode, timeLimitMinutes: v.timeLimitMinutes === "" ? null : v.timeLimitMinutes, attachmentFileIds: files.map((f) => f.id) };
      const r = await saveAssignmentAction(p.id, payload);
      if (!r.ok) {
        setErrors(r.fields ?? {});
        setFormError(r.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (r.data.keptDraft) toast.info("Saqlandi. Quizni e’lon qilish uchun avval savollar qo‘shing.");
      else toast.success(mode === "draft" && !live ? "Qoralama saqlandi" : mode === "schedule" ? "Rejalashtirildi" : "Saqlandi va e’lon qilindi");
      if (!p.id || isQuiz) router.push(`${p.base}/assignments/${r.data.id}${isQuiz ? "?tab=questions" : ""}`);
      else router.refresh();
    });

  return (
    <div className="space-y-5">
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      {live ? <Alert tone="info">Bu vazifa e’lon qilingan. O‘zgarishlar darhol o‘quvchilarga ko‘rinadi.</Alert> : null}

      <Card>
        <CardHeader title="Asosiy ma’lumot" icon={<FileText />} />
        <CardBody className="space-y-5">
          <Field label="Sarlavha" htmlFor="title" required error={errors.title}>
            <Input id="title" value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder="Masalan: Kasrlarni qo‘shish" />
          </Field>
          <div>
            <div className="mb-2 text-[13px] font-medium text-text-2">Turi</div>
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
                  <span className="text-[13px] font-semibold">{t.assignmentType[k]}</span>
                  <span className="text-[11.5px] text-muted">{d}</span>
                </button>
              ))}
            </div>
            {p.hasWork ? <p className="mt-2 text-[12px] text-muted">O‘quvchilar ishlay boshlagani uchun turini o‘zgartirib bo‘lmaydi.</p> : null}
          </div>
          <Field label="Fan" htmlFor="subject" required error={errors.subjectId}>
            <Select id="subject" value={v.subjectId} onChange={(e) => set("subjectId", e.target.value)}>
              <option value="">Tanlang…</option>
              {p.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Qisqa tavsif" htmlFor="desc" error={errors.description}>
            <Textarea id="desc" value={v.description} onChange={(e) => set("description", e.target.value)} rows={3} maxLength={5000} />
          </Field>
          <Field label="Ko‘rsatmalar" htmlFor="instr" hint="Havolalar avtomatik bosiladigan bo‘ladi. Formulalar: $a^2+b^2=c^2$" error={errors.instructions}>
            <Textarea id="instr" value={v.instructions} onChange={(e) => set("instructions", e.target.value)} rows={7} maxLength={20000} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Materiallar" icon={<Link2 />} description="Fayllar faqat shu vazifani ko‘ra oladiganlarga ochiladi." />
        <CardBody className="space-y-4">
          <Uploader files={files} onChange={setFiles} max={20} label="Fayl yoki rasm biriktirish" />
          <div className="space-y-2">
            {v.links.map((l, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
                <Input value={l.title} onChange={(e) => set("links", v.links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Havola nomi" aria-label="Havola nomi" />
                <Input value={l.url} onChange={(e) => set("links", v.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://…" inputMode="url" aria-label="URL" />
                <Button variant="ghost" size="icon" onClick={() => set("links", v.links.filter((_, j) => j !== i))} aria-label="Havolani o‘chirish">
                  <Trash2 />
                </Button>
              </div>
            ))}
            {errors["links.0.url"] || errors["links"] ? <p className="text-[12.5px] text-danger">{errors["links.0.url"] ?? errors.links}</p> : null}
            <Button variant="secondary" size="sm" onClick={() => set("links", [...v.links, { title: "", url: "" }])}>
              <Plus /> Havola qo‘shish
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Kimlar uchun" icon={<Users />} description="Sinflar va/yoki alohida o‘quvchilar" />
        <CardBody className="space-y-4">
          {errors.classIds ? <p className="text-[12.5px] text-danger">{errors.classIds}</p> : null}
          <div className="grid gap-2 sm:grid-cols-3">
            {p.classes.map((c) => (
              <label key={c.id} className={cn("flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-[14px]", v.classIds.includes(c.id) ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2")}>
                <span className="flex items-center gap-2.5">
                  <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={v.classIds.includes(c.id)} onChange={(e) => set("classIds", e.target.checked ? [...v.classIds, c.id] : v.classIds.filter((x) => x !== c.id))} />
                  <span className="font-medium">{c.name}</span>
                </span>
                <span className="text-[12px] text-muted">{c.students} o‘q.</span>
              </label>
            ))}
            {!p.classes.length ? <p className="text-[13px] text-muted">Sizga biriktirilgan sinf yo‘q.</p> : null}
          </div>
          <details className="rounded-xl border border-border px-4 py-3" open={v.studentIds.length > 0}>
            <summary className="cursor-pointer text-[13.5px] font-medium">Alohida o‘quvchilar ({v.studentIds.length})</summary>
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <Input value={studentQ} onChange={(e) => setStudentQ(e.target.value)} placeholder="Ism yoki sinf bo‘yicha qidirish" className="pl-9" />
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {filteredStudents.map((s) => (
                  <Checkbox key={s.id} className="rounded-lg px-2 py-1.5 hover:bg-surface-2" checked={v.studentIds.includes(s.id)} onChange={(c) => set("studentIds", c ? [...v.studentIds, s.id] : v.studentIds.filter((x) => x !== s.id))} label={<>{s.displayName} <span className="text-muted">· {s.className || "sinfsiz"}</span></>} />
                ))}
              </div>
            </div>
          </details>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Muddat va qoidalar" icon={<CalendarClock />} description="Vaqtlar Toshkent vaqti bo‘yicha" />
        <CardBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Topshirish muddati" htmlFor="due" hint="Bo‘sh qoldirsangiz — muddatsiz" error={errors.dueAt}>
              <Input id="due" type="datetime-local" value={v.dueAt} onChange={(e) => set("dueAt", e.target.value)} />
            </Field>
            {!isQuiz && v.type !== "material" ? (
              <Field label="Maksimal ball" htmlFor="max" error={errors.maxScore}>
                <Input id="max" type="number" min={1} max={1000} step="0.5" value={v.maxScore} onChange={(e) => set("maxScore", Number(e.target.value))} />
              </Field>
            ) : isQuiz ? (
              <Field label="Maksimal ball" hint="Savollar ballari yig‘indisidan avtomatik hisoblanadi">
                <Input value={`${v.maxScore}`} disabled />
              </Field>
            ) : null}
          </div>
          {v.type !== "material" ? (
            <div className="space-y-3 rounded-xl bg-surface-2/60 p-4">
              <Switch checked={v.allowLate} onChange={(x) => set("allowLate", x)} label="Kechikib topshirishga ruxsat" description="Muddatdan keyin ham qabul qilinadi va “kechikkan” deb belgilanadi" />
              {v.allowLate ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Kechikish jarimasi, %" htmlFor="pen" hint="Maksimal balldan ayiriladi">
                    <Input id="pen" type="number" min={0} max={100} value={v.latePenaltyPercent} onChange={(e) => set("latePenaltyPercent", Number(e.target.value))} />
                  </Field>
                  <Field label="Oxirgi chegara (ixtiyoriy)" htmlFor="cut" error={errors.lateCutoffAt}>
                    <Input id="cut" type="datetime-local" value={v.lateCutoffAt} onChange={(e) => set("lateCutoffAt", e.target.value)} />
                  </Field>
                </div>
              ) : null}
              {isWork ? (
                <>
                  <Switch checked={v.allowResubmission} onChange={(x) => set("allowResubmission", x)} label="Qayta topshirishga ruxsat" description="Yakuniy baho qo‘yilgunga qadar" />
                  {v.allowResubmission ? (
                    <Field label="Necha marta qayta topshirish mumkin" htmlFor="resub" className="max-w-xs">
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
          <CardHeader title="Quiz sozlamalari" icon={<Settings2 />} />
          <CardBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Vaqt chegarasi, daqiqa" htmlFor="tl" hint={v.type === "timed_quiz" ? "Majburiy" : "Bo‘sh — cheklanmagan"}>
                <Input id="tl" type="number" min={1} max={600} value={v.timeLimitMinutes} onChange={(e) => set("timeLimitMinutes", e.target.value === "" ? "" : Number(e.target.value))} />
              </Field>
              <Field label="Urinishlar soni" htmlFor="att">
                <Input id="att" type="number" min={1} max={20} value={v.maxAttempts} onChange={(e) => set("maxAttempts", Number(e.target.value))} />
              </Field>
              <Field label="O‘tish bali, %" htmlFor="pass">
                <Input id="pass" type="number" min={0} max={100} value={v.passingPercent} onChange={(e) => set("passingPercent", Number(e.target.value))} />
              </Field>
            </div>
            <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              <Switch checked={v.shuffleQuestions} onChange={(x) => set("shuffleQuestions", x)} label="Savollarni aralashtirish" />
              <Switch checked={v.shuffleOptions} onChange={(x) => set("shuffleOptions", x)} label="Variantlarni aralashtirish" />
              <Switch checked={v.allowBackNavigation} onChange={(x) => set("allowBackNavigation", x)} label="Oldingi savolga qaytish" />
              <Switch checked={v.showOverview} onChange={(x) => set("showOverview", x)} label="Savollar ro‘yxatini ko‘rsatish" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Natijalarni ko‘rish" htmlFor="rev">
                <Select id="rev" value={v.reviewMode} onChange={(e) => set("reviewMode", e.target.value as BuilderValue["reviewMode"])}>
                  <option value="after_submit">Topshirgandan so‘ng</option>
                  <option value="after_due">Muddat tugagandan so‘ng</option>
                  <option value="after_grading">To‘liq baholangandan so‘ng</option>
                  <option value="never">Ko‘rsatmaslik</option>
                </Select>
              </Field>
              <div className="pt-6">
                <Switch checked={v.showCorrectAnswers} onChange={(x) => set("showCorrectAnswers", x)} label="To‘g‘ri javoblarni ko‘rsatish" disabled={v.reviewMode === "never"} />
              </div>
            </div>
            {v.type === "practice" ? <Alert tone="info">Mashqlar rasmiy baho yaratmaydi. Urinishlar soni kamida 5 ta bo‘ladi.</Alert> : null}
          </CardBody>
        </Card>
      ) : null}

      {isWork ? (
        <Card>
          <CardHeader title="Baholash mezonlari (ixtiyoriy)" icon={<Scale />} description={v.rubric.length ? `Yig‘indi: ${rubricSum} / ${v.maxScore} ball` : "Rubrika qo‘shsangiz, baho mezonlar yig‘indisidan hisoblanadi"} />
          <CardBody className="space-y-2">
            {v.rubric.map((c, i) => (
              <div key={c.id} className="grid gap-2 sm:grid-cols-[1.2fr_1.5fr_110px_auto]">
                <Input value={c.title} onChange={(e) => set("rubric", v.rubric.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Mezon" aria-label="Mezon nomi" />
                <Input value={c.description ?? ""} onChange={(e) => set("rubric", v.rubric.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} placeholder="Tavsif (ixtiyoriy)" aria-label="Tavsif" />
                <Input type="number" min={0.5} step="0.5" value={c.maxPoints} onChange={(e) => set("rubric", v.rubric.map((x, j) => (j === i ? { ...x, maxPoints: Number(e.target.value) } : x)))} aria-label="Ball" />
                <Button variant="ghost" size="icon" onClick={() => set("rubric", v.rubric.filter((_, j) => j !== i))} aria-label="Mezonni o‘chirish">
                  <Trash2 />
                </Button>
              </div>
            ))}
            {errors.rubric ? <p className="text-[12.5px] text-danger">{errors.rubric}</p> : null}
            <Button variant="secondary" size="sm" onClick={() => set("rubric", [...v.rubric, { id: Math.random().toString(36).slice(2, 10), title: "", maxPoints: 1 }])}>
              <Plus /> Mezon qo‘shish
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {!live ? (
        <Card>
          <CardHeader title="E’lon qilish" icon={<Send />} />
          <CardBody className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["draft", "Qoralama", "Faqat siz ko‘rasiz"],
                  ["now", "Hozir e’lon qilish", "O‘quvchilarga darhol ko‘rinadi"],
                  ["schedule", "Rejalashtirish", "Belgilangan vaqtda"],
                ] as const
              ).map(([k, l, d]) => (
                <button key={k} type="button" onClick={() => set("publishMode", k)} className={cn("rounded-xl border p-3 text-left", v.publishMode === k ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-border hover:bg-surface-2")} aria-pressed={v.publishMode === k}>
                  <div className="text-[13.5px] font-semibold">{l}</div>
                  <div className="text-[12px] text-muted">{d}</div>
                </button>
              ))}
            </div>
            {v.publishMode === "schedule" ? (
              <Field label="E’lon qilish vaqti" htmlFor="pub" error={errors.publishAt} className="max-w-xs">
                <Input id="pub" type="datetime-local" value={v.publishAt} onChange={(e) => set("publishAt", e.target.value)} />
              </Field>
            ) : null}
            {isQuiz && !p.id && v.publishMode !== "draft" ? <p className="text-[12.5px] text-muted">Quiz avval qoralama sifatida saqlanadi — keyingi bosqichda savollar qo‘shib, e’lon qilasiz.</p> : null}
          </CardBody>
        </Card>
      ) : null}

      <div className="sticky bottom-4 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-pop backdrop-blur">
        {!live ? (
          <Button variant="secondary" onClick={() => submit("draft")} loading={pending}>
            <Save /> Qoralama
          </Button>
        ) : null}
        <Button onClick={() => submit(live ? "now" : isQuiz && !p.id ? "draft" : v.publishMode)} loading={pending}>
          <Send /> {live ? "O‘zgarishlarni saqlash" : isQuiz && !p.id ? "Saqlash va savollarga o‘tish" : v.publishMode === "now" ? "E’lon qilish" : v.publishMode === "schedule" ? "Rejalashtirish" : "Saqlash"}
        </Button>
      </div>
    </div>
  );
}
