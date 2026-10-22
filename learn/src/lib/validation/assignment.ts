import { z } from "zod";
import { countBlanks } from "@/lib/scoring";
import { tr } from "@/lib/i18n/tr";

const uuid = z.string().uuid();
const httpsUrl = z
  .string()
  .trim()
  .url("Havola noto‘g‘ri")
  .refine((u) => /^https?:\/\//i.test(u), "Havola http(s):// bilan boshlanishi kerak");
const optionalDateTime = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v), "Sana noto‘g‘ri")
  .default("");

export const ASSIGNMENT_TYPES = ["written", "file_upload", "multiple_choice", "short_answer", "true_false", "timed_quiz", "practice", "material", "homework"] as const;

export const assignmentInput = z
  .object({
    title: z.string().trim().min(3, "Sarlavha kamida 3 ta belgi").max(200),
    description: z.string().trim().max(5000).default(""),
    instructions: z.string().trim().max(20000).default(""),
    type: z.enum(ASSIGNMENT_TYPES),
    subjectId: uuid,
    dueAt: optionalDateTime,
    publishMode: z.enum(["draft", "now", "schedule"]),
    publishAt: optionalDateTime,
    maxScore: z.coerce.number().min(1).max(1000).default(100),
    allowLate: z.boolean().default(true),
    latePenaltyPercent: z.coerce.number().int().min(0).max(100).default(0),
    lateCutoffAt: optionalDateTime,
    allowResubmission: z.boolean().default(false),
    maxResubmissions: z.coerce.number().int().min(0).max(10).default(0),
    timeLimitMinutes: z.union([z.coerce.number().int().min(1).max(600), z.literal(""), z.null()]).transform((v) => (v === "" ? null : v)).default(null),
    maxAttempts: z.coerce.number().int().min(1).max(20).default(1),
    passingPercent: z.coerce.number().int().min(0).max(100).default(60),
    shuffleQuestions: z.boolean().default(false),
    shuffleOptions: z.boolean().default(false),
    allowBackNavigation: z.boolean().default(true),
    showOverview: z.boolean().default(true),
    reviewMode: z.enum(["never", "after_submit", "after_due", "after_grading"]).default("after_submit"),
    showCorrectAnswers: z.boolean().default(true),
    links: z.array(z.object({ title: z.string().trim().min(1).max(120), url: httpsUrl })).max(20).default([]),
    rubric: z
      .array(z.object({ id: z.string().min(1).max(40), title: z.string().trim().min(1).max(120), description: z.string().trim().max(500).optional(), maxPoints: z.coerce.number().min(0.5).max(1000) }))
      .max(20)
      .default([]),
    classIds: z.array(uuid).max(100).default([]),
    studentIds: z.array(uuid).max(500).default([]),
    attachmentFileIds: z.array(uuid).max(30).default([]),
    level: z.string().trim().max(40).default(""),
    topic: z.string().trim().max(120).default(""),
    passage: z.string().trim().max(20000).default(""),
    audioFileId: uuid.nullable().default(null),
    transcript: z.string().trim().max(20000).default(""),
    transcriptMode: z.enum(["never", "after_submit", "always"]).default("after_submit"),
    replayLimit: z.union([z.coerce.number().int().min(1).max(20), z.literal(""), z.null()]).transform((v) => (v === "" ? null : v)).default(null),
    items: z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          kind: z.enum(["reading", "vocabulary", "listening", "translation", "tapescript", "writing", "other"]),
          title: z.string().trim().min(1, "Topshiriq nomini yozing").max(200),
          bookId: uuid.nullable().optional(),
          range: z.string().trim().max(120).optional(),
          note: z.string().trim().max(2000).optional(),
        }),
      )
      .max(20)
      .default([]),
  })
  .superRefine((v, ctx) => {
    if (v.type === "homework" && v.items.length === 0) ctx.addIssue({ code: "custom", path: ["items"], message: tr("Uyga vazifaga kamida bitta topshiriq qo‘shing") });
    if (v.publishMode === "schedule" && !v.publishAt) ctx.addIssue({ code: "custom", path: ["publishAt"], message: tr("E’lon qilish vaqtini kiriting") });
    if (v.publishMode !== "draft" && v.classIds.length + v.studentIds.length === 0)
      ctx.addIssue({ code: "custom", path: ["classIds"], message: tr("Kamida bitta guruh yoki o‘quvchini tanlang") });
    if (v.lateCutoffAt && v.dueAt && v.lateCutoffAt < v.dueAt) ctx.addIssue({ code: "custom", path: ["lateCutoffAt"], message: tr("Kechikish chegarasi muddatdan keyin bo‘lishi kerak") });
    if (v.rubric.length) {
      const sum = v.rubric.reduce((s, c) => s + c.maxPoints, 0);
      if (Math.abs(sum - v.maxScore) > 0.001) ctx.addIssue({ code: "custom", path: ["rubric"], message: tr("Mezonlar yig‘indisi ({0}) maksimal ballga ({1}) teng bo‘lishi kerak", sum, v.maxScore) });
    }
  });
export type AssignmentInput = z.infer<typeof assignmentInput>;

export const QUESTION_TYPES = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "short_answer",
  "fill_blank",
  "matching",
  "essay",
  "arrange_words",
  "translation",
  "grammar_correction",
  "irregular_verb",
] as const;

export const questionInput = z
  .object({
    type: z.enum(QUESTION_TYPES),
    prompt: z.string().trim().min(1, "Savol matni kerak").max(5000),
    points: z.coerce.number().min(0).max(100).default(1),
    explanation: z.string().trim().max(3000).default(""),
    imageFileId: uuid.nullable().default(null),
    options: z.array(z.object({ label: z.string().trim().min(1, "Variant matni kerak").max(1000), isCorrect: z.boolean() })).max(10).default([]),
    accepted: z.array(z.array(z.string().trim().min(1).max(200)).max(20)).max(20).default([]),
    caseSensitive: z.boolean().default(false),
    pairs: z.array(z.object({ left: z.string().trim().min(1).max(300), right: z.string().trim().min(1).max(300) })).max(12).default([]),
    words: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    direction: z.enum(["en_uz", "uz_en"]).nullable().default(null),
    incorrect: z.string().trim().max(1000).default(""),
    base: z.string().trim().max(60).default(""),
    audioFileId: uuid.nullable().default(null),
  })
  .superRefine((q, ctx) => {
    const correct = q.options.filter((o) => o.isCorrect).length;
    const add = (message: string) => ctx.addIssue({ code: "custom", message });
    if (q.type === "single_choice" && (q.options.length < 2 || correct !== 1)) add(tr("Kamida 2 ta variant va aynan bitta to‘g‘ri javob kerak"));
    if (q.type === "multiple_choice" && (q.options.length < 2 || correct < 1)) add(tr("Kamida 2 ta variant va kamida bitta to‘g‘ri javob kerak"));
    if (q.type === "true_false" && (q.options.length !== 2 || correct !== 1)) add(tr("To‘g‘ri/noto‘g‘ri savolida bitta to‘g‘ri javob belgilang"));
    if (q.type === "fill_blank") {
      const n = countBlanks(q.prompt);
      if (n === 0) add(tr("Matnda bo‘sh joyni ___ bilan belgilang"));
      else if (q.accepted.length !== n || q.accepted.some((a) => a.length === 0)) add(tr("Har bir bo‘sh joy ({0} ta) uchun to‘g‘ri javob kiriting", n));
    }
    if (q.type === "matching" && q.pairs.length < 2) add(tr("Kamida 2 ta juftlik kerak"));
    if (q.type === "arrange_words" && q.words.length < 2) add(tr("Gapni kamida 2 ta so‘zga ajrating"));
    if (q.type === "grammar_correction" && (!q.incorrect || !q.accepted[0]?.length)) add(tr("Xato gapni va to‘g‘ri variant(lar)ni kiriting"));
    if (q.type === "irregular_verb" && (!q.base || q.accepted.length !== 2 || q.accepted.some((a) => !a.length))) add(tr("Fe’lning asosiy shakli, Past Simple va Past Participle shakllarini kiriting"));
  });
export type QuestionInput = z.infer<typeof questionInput>;

export const questionsInput = z.array(questionInput).max(200);
