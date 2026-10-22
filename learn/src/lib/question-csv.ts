import { parseCsv } from "./utils";
import { countBlanks } from "./scoring";
import { QUESTION_TYPES } from "./validation/assignment";

/**
 * CSV template for quiz questions (header row required):
 *   type,prompt,points,options,answers,extra,explanation
 *
 * - options:  choices split by "|", correct ones start with "*"  (single_choice, multiple_choice)
 *             or pairs "left=right|left=right"                       (matching)
 * - answers:  accepted answers split by "|"; several blanks split by "#"  (fill_blank: "go|goes#went")
 *             irregular_verb: "was|were#been"; arrange_words: the correct sentence
 * - extra:    irregular_verb → base form; grammar_correction → the wrong sentence;
 *             translation → en_uz | uz_en
 * - true_false: answers is "true" or "false".
 */
export const QUESTION_CSV_HEADER = "type,prompt,points,options,answers,extra,explanation";
export const QUESTION_CSV_EXAMPLE = [
  QUESTION_CSV_HEADER,
  'single_choice,"She ___ to school every day.",1,"*goes|go|going",,,"He/She/It bilan fe’lga -s qo‘shiladi."',
  'true_false,"\'Children\' is the plural of \'child\'.",1,,true,,',
  'fill_blank,"I ___ (be) at home yesterday.",1,,was,,',
  'translation,"Men har kuni ingliz tilini o‘rganaman.",2,,"I learn English every day|I study English every day",uz_en,',
  'grammar_correction,"Find and correct the mistake.",2,,"She doesn\'t like coffee|She does not like coffee","She don\'t like coffee.",',
  'arrange_words,"Put the words in order.",2,,"I have never been to London",,',
  'irregular_verb,"Write V2 and V3.",2,,"went#gone",go,',
  'matching,"Match the words.",3,"apple=olma|book=kitob|water=suv",,,',
  'essay,"Write 5 sentences about your family.",5,,,,',
].join("\n");

export type CsvQuestion = {
  type: (typeof QUESTION_TYPES)[number];
  prompt: string;
  points: number;
  explanation: string;
  options: { label: string; isCorrect: boolean }[];
  accepted: string[][];
  pairs: { left: string; right: string }[];
  words: string[];
  direction: "en_uz" | "uz_en" | null;
  incorrect: string;
  base: string;
};

const split = (s: string, sep: string) =>
  s
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);

export function parseQuestionCsv(text: string): { questions: CsvQuestion[]; errors: { line: number; message: string }[] } {
  const rows = parseCsv(text);
  const errors: { line: number; message: string }[] = [];
  const questions: CsvQuestion[] = [];
  if (!rows.length) return { questions, errors: [{ line: 1, message: "Fayl bo‘sh." }] };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  if (col("type") < 0 || col("prompt") < 0) return { questions, errors: [{ line: 1, message: `Sarlavha qatori kerak: ${QUESTION_CSV_HEADER}` }] };
  const get = (r: string[], name: string) => (col(name) >= 0 ? (r[col(name)] ?? "").trim() : "");
  if (rows.length > 201) errors.push({ line: 1, message: "Bir martada ko‘pi bilan 200 ta savol." });

  rows.slice(1, 201).forEach((r, i) => {
    const line = i + 2;
    const type = get(r, "type").toLowerCase() as CsvQuestion["type"];
    const prompt = get(r, "prompt");
    const fail = (message: string) => errors.push({ line, message });
    if (!QUESTION_TYPES.includes(type)) return fail(`Noma’lum tur: “${get(r, "type")}”`);
    if (!prompt) return fail("Savol matni bo‘sh");
    const pointsRaw = get(r, "points");
    const points = pointsRaw ? Number(pointsRaw.replace(",", ".")) : type === "essay" ? 5 : 1;
    if (!Number.isFinite(points) || points < 0 || points > 100) return fail("Ball 0–100 oralig‘ida bo‘lishi kerak");
    const answers = get(r, "answers");
    const extra = get(r, "extra");
    const q: CsvQuestion = { type, prompt, points, explanation: get(r, "explanation"), options: [], accepted: [], pairs: [], words: [], direction: null, incorrect: "", base: "" };

    switch (type) {
      case "single_choice":
      case "multiple_choice": {
        q.options = split(get(r, "options"), "|").map((o) => ({ label: o.replace(/^\*/, "").trim(), isCorrect: o.startsWith("*") }));
        const correct = q.options.filter((o) => o.isCorrect).length;
        if (q.options.length < 2) return fail("Kamida 2 ta variant kerak (| bilan ajrating)");
        if (type === "single_choice" ? correct !== 1 : correct < 1) return fail("To‘g‘ri variant(lar)ni * bilan belgilang");
        break;
      }
      case "true_false": {
        const v = answers.toLowerCase();
        if (!["true", "false", "to‘g‘ri", "noto‘g‘ri"].includes(v)) return fail("answers ustuniga true yoki false yozing");
        const yes = v === "true" || v === "to‘g‘ri";
        q.options = [
          { label: "To‘g‘ri", isCorrect: yes },
          { label: "Noto‘g‘ri", isCorrect: !yes },
        ];
        break;
      }
      case "short_answer":
      case "translation":
        q.accepted = [split(answers, "|")];
        if (type === "translation") q.direction = extra === "uz_en" ? "uz_en" : "en_uz";
        break;
      case "grammar_correction":
        q.incorrect = extra;
        q.accepted = [split(answers, "|")];
        if (!q.incorrect || !q.accepted[0].length) return fail("extra ustunida xato gap, answers ustunida to‘g‘ri variant kerak");
        break;
      case "fill_blank": {
        q.accepted = answers.split("#").map((b) => split(b, "|"));
        const n = countBlanks(prompt);
        if (!n) return fail("Matnda bo‘sh joyni ___ bilan belgilang");
        if (q.accepted.length !== n || q.accepted.some((a) => !a.length)) return fail(`${n} ta bo‘sh joy uchun javob kerak (# bilan ajrating)`);
        break;
      }
      case "irregular_verb":
        q.base = extra;
        q.accepted = answers.split("#").map((b) => split(b, "|"));
        if (!q.base || q.accepted.length !== 2 || q.accepted.some((a) => !a.length)) return fail("extra: asosiy shakl; answers: V2#V3 (masalan went#gone)");
        break;
      case "arrange_words":
        q.words = split(answers, " ");
        q.accepted = [[]];
        if (q.words.length < 2) return fail("answers ustuniga to‘g‘ri gapni yozing");
        break;
      case "matching":
        q.pairs = split(get(r, "options"), "|").map((p) => {
          const [left, ...rest] = p.split("=");
          return { left: (left ?? "").trim(), right: rest.join("=").trim() };
        });
        if (q.pairs.length < 2 || q.pairs.some((p) => !p.left || !p.right)) return fail("options: chap=o‘ng|chap=o‘ng (kamida 2 ta)");
        break;
      case "essay":
        break;
    }
    questions.push(q);
  });
  return { questions, errors };
}
