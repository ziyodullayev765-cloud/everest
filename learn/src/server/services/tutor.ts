import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { isStudent, type Actor } from "../auth/rbac";
import { AppError, forbidden } from "../errors";
import { enforce } from "./rate-limit";
import { tr } from "@/lib/i18n/tr";

/**
 * Optional AI English tutor. Enabled only when ANTHROPIC_API_KEY is set on the server; the key never
 * reaches the browser. Answers are shown marked as AI-generated and never touch grades.
 */
export const tutorEnabled = () => !!process.env.ANTHROPIC_API_KEY;

const MODEL = "claude-opus-5-5";
const dailyLimit = () => Math.max(1, Number(process.env.TUTOR_DAILY_LIMIT ?? 20));

export const TUTOR_KINDS = {
  get grammar() { return tr("Grammatikani tushuntirish"); },
  get mistake() { return tr("Xatoimni tushuntirish"); },
  get writing() { return tr("Yozganimga fikr"); },
  get vocabulary() { return tr("So‘zni kontekstda tushunish"); },
  get practice() { return tr("Qo‘shimcha mashq"); },
  get next() { return tr("Keyin nimani o‘rganay?"); },
} as const;
export type TutorKind = keyof typeof TUTOR_KINDS;

const SYSTEM = `You are an English tutor inside an English course app for Uzbek-speaking students (mostly teenagers and young adults, levels A1–C1).

Write your answers in simple, friendly Uzbek (Latin script). Keep English examples, rules and corrected sentences in English, and translate them into Uzbek when that helps. Be concise: short paragraphs or a short list, no long introductions.

You help students learn; you do not do graded homework for them. If a message looks like a full assignment the student wants finished, explain the idea and give a similar example instead of the finished answer. You cannot see or change grades, deadlines or teacher decisions — if asked, say the teacher decides.

Only discuss learning English. Politely decline other topics.`;

const PROMPTS: Record<TutorKind, (text: string, extra: string) => string> = {
  grammar: (t) => tr("Explain this English grammar topic or question simply, with 3–4 example sentences and a common mistake to avoid:\n\n{0}", t),
  mistake: (t, extra) => tr("A student answered an exercise. Explain why the answer is wrong (or right), what the correct form is, and the rule behind it.\n\nExercise and answers:\n{0}{1}", t, extra ? tr("\n\nStudent's question: {0}", extra) : ""),
  writing: (t) => tr("Give feedback on this piece of student writing: list the most important mistakes with corrections (original → corrected) and a short explanation each, then one or two tips to improve. Do not rewrite the whole text.\n\n{0}", t),
  vocabulary: (t, extra) => `Explain the meaning of this English word or phrase in context, give its Uzbek translation, and 3 natural example sentences.\n\nWord/phrase: ${t}${extra ? `\nContext: ${extra}` : ""}`,
  practice: (t) => tr("Create 5 short practice exercises (with an answer key at the end) for this topic. Note that these are extra practice, not an official test.\n\nTopic: {0}", t),
  next: (t) => tr("Based on this summary of a student's recent results, suggest what to practise next (2–4 concrete items, with why).\n\n{0}", t),
};

const input = z.object({
  kind: z.enum(Object.keys(TUTOR_KINDS) as [TutorKind, ...TutorKind[]]),
  text: z.string().trim().min(2, "Savolingizni yozing").max(4000, "Matn juda uzun (4000 belgigacha)"),
  extra: z.string().trim().max(1000).default(""),
});

export async function tutorUsage(userId: string) {
  const since = new Date(Date.now() - 24 * 3600_000);
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.aiRequests)
    .where(and(eq(schema.aiRequests.userId, userId), gte(schema.aiRequests.createdAt, since)));
  return { used: r?.n ?? 0, limit: dailyLimit() };
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export async function askTutor(actor: Actor, raw: unknown): Promise<{ text: string; remaining: number }> {
  if (!isStudent(actor)) throw forbidden();
  if (!tutorEnabled()) throw new AppError("unavailable", tr("AI yordamchi sozlanmagan."));
  const v = input.parse(raw);
  await enforce(`tutor:${actor.id}`, 6, 60);
  const usage = await tutorUsage(actor.id);
  if (usage.used >= usage.limit) throw new AppError("rate_limited", tr("Bugungi limit tugadi ({0} ta savol). Ertaga qayta urinib ko‘ring.", usage.limit));

  const prompt = PROMPTS[v.kind](v.text, v.extra);
  let text = "";
  let ok = false;
  try {
    const res = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: v.kind === "writing" || v.kind === "mistake" ? "medium" : "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    });
    if (res.stop_reason === "refusal") {
      text = "";
    } else {
      text = res.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      ok = text.length > 0;
    }
  } catch (e) {
    await logRequest(actor.id, v.kind, prompt.length, 0, false);
    if (e instanceof Anthropic.RateLimitError) throw new AppError("rate_limited", tr("AI xizmati hozir band. Birozdan so‘ng qayta urinib ko‘ring."));
    if (e instanceof Anthropic.APIError) {
      console.error("[tutor]", e.status, e.message);
      throw new AppError("unavailable", tr("AI xizmatidan javob olinmadi. Keyinroq urinib ko‘ring."));
    }
    throw e;
  }
  await logRequest(actor.id, v.kind, prompt.length, text.length, ok);
  if (!ok) throw new AppError("unavailable", tr("Bu savolga javob berilmadi. Savolni boshqacha yozib ko‘ring."));
  return { text, remaining: Math.max(0, usage.limit - usage.used - 1) };
}

async function logRequest(userId: string, kind: string, inputChars: number, outputChars: number, ok: boolean) {
  await db.insert(schema.aiRequests).values({ userId, kind, inputChars, outputChars, ok });
}
