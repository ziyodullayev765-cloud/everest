import { wordInput, type WordInput } from "./word-csv";
import { tr } from "@/lib/i18n/tr";

/**
 * Vocabulary import, the parts shared by the browser (column mapping UI) and the server (validation):
 * the importable fields, the header names each one is recognised by, and row → word conversion.
 */

export const IMPORT_FIELDS = [
  { key: "english", required: true, get label() { return tr("Inglizcha so‘z"); } },
  { key: "uzbek", required: true, get label() { return tr("Tarjima"); } },
  { key: "definition", get label() { return tr("Ta’rif"); } },
  { key: "example", get label() { return tr("Misol gap"); } },
  { key: "exampleUz", get label() { return tr("Misol tarjimasi"); } },
  { key: "partOfSpeech", get label() { return tr("So‘z turkumi"); } },
  { key: "phonetic", get label() { return tr("Talaffuz"); } },
  { key: "synonyms", get label() { return tr("Sinonimlar"); } },
  { key: "unit", get label() { return tr("Unit / dars"); } },
  { key: "difficulty", get label() { return tr("Qiyinlik"); } },
  { key: "tags", get label() { return tr("Teglar"); } },
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number]["key"];
/** Column index → field ("" = ignore). */
export type ColumnMapping = (ImportField | "")[];

const norm = (h: string) =>
  h
    .toLowerCase()
    .replace(/[‘’ʻʼ`'"]/g, "")
    .replace(/[^a-z0-9а-яёўқғҳ]+/gi, " ")
    .trim();

/** Header spellings (normalised) each field is recognised by: English, Uzbek Latin and Cyrillic. */
const SYNONYMS: Record<ImportField, string[]> = {
  english: ["english", "en", "eng", "word", "words", "vocabulary", "vocab", "term", "inglizcha", "ingliz", "ingliz tili", "soz", "suz", "английский", "слово", "инглизча", "сўз"],
  uzbek: ["uzbek", "uz", "translation", "translate", "meaning", "tarjima", "tarjimasi", "uzbekcha", "ozbekcha", "manosi", "mano", "перевод", "таржима", "ўзбекча", "маъноси"],
  definition: ["definition", "def", "explanation", "tarif", "izoh", "описание", "определение", "таъриф"],
  example: ["example", "example sentence", "sentence", "example en", "misol", "namuna", "gap", "пример", "мисол"],
  exampleUz: ["example uz", "example translation", "example uzbek", "misol tarjimasi", "misol uz", "gap tarjimasi", "перевод примера"],
  partOfSpeech: ["part of speech", "pos", "type", "word type", "class", "soz turkumi", "turkum", "часть речи", "туркум"],
  phonetic: ["phonetic", "phonetics", "pronunciation", "transcription", "ipa", "talaffuz", "transkripsiya", "произношение", "транскрипция", "талаффуз"],
  synonyms: ["synonyms", "synonym", "sinonim", "sinonimlar", "синонимы", "синоним"],
  unit: ["unit", "lesson", "chapter", "module", "dars", "mavzu", "bob", "урок", "раздел", "дарс"],
  difficulty: ["difficulty", "level", "difficulty level", "qiyinlik", "daraja", "сложность", "уровень", "қийинлик"],
  tags: ["tags", "tag", "category", "topic", "teg", "teglar", "kategoriya", "теги", "тег"],
};

/** Best guess of what each column holds; unknown columns are ignored until the admin maps them. */
export function guessMapping(headers: string[]): ColumnMapping {
  const used = new Set<ImportField>();
  const out: ColumnMapping = headers.map((h) => {
    const n = norm(h);
    const f = (Object.keys(SYNONYMS) as ImportField[]).find((k) => !used.has(k) && SYNONYMS[k].includes(n));
    if (f) used.add(f);
    return f ?? "";
  });
  // No recognisable header: assume "english, uzbek, example, …" by position.
  if (!used.size) {
    const order: ImportField[] = ["english", "uzbek", "example", "exampleUz", "phonetic", "partOfSpeech", "difficulty"];
    return headers.map((_, i) => order[i] ?? "");
  }
  return out;
}

/** Whether the first row looks like column names rather than a word (two recognised names, so "word,so‘z" data isn't eaten). */
export function looksLikeHeader(first: string[]): boolean {
  const hits = first.filter((h) => (Object.values(SYNONYMS) as string[][]).some((list) => list.includes(norm(h)))).length;
  return hits >= Math.min(2, first.filter((h) => h.trim()).length);
}

const DIFFICULTY: Record<string, number> = {
  "1": 1, easy: 1, oson: 1, beginner: 1, a1: 1, a2: 1, low: 1,
  "2": 2, medium: 2, orta: 2, intermediate: 2, b1: 2, b2: 2, normal: 2,
  "3": 3, hard: 3, qiyin: 3, advanced: 3, c1: 3, c2: 3, high: 3,
};

export type ParsedRow = { line: number; word?: WordInput; error?: string };

/** Turns one table row into a validated word using the mapping. `line` is the 1-based line in the file. */
export function rowToWord(cells: string[], mapping: ColumnMapping, line: number): ParsedRow {
  const raw: Record<string, string> = {};
  mapping.forEach((f, i) => {
    if (!f) return;
    const v = (cells[i] ?? "").replace(/\s+/g, " ").trim();
    raw[f] = raw[f] ? `${raw[f]}, ${v}` : v;
  });
  let difficulty = 2;
  if (raw.difficulty) {
    const d = DIFFICULTY[norm(raw.difficulty).replace(/\s/g, "")];
    if (!d) return { line, error: tr("Qiyinlik noto‘g‘ri: “{0}” (1–3, easy/medium/hard yoki A1–C2)", raw.difficulty) };
    difficulty = d;
  }
  const parsed = wordInput.safeParse({ ...raw, difficulty });
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    const field = IMPORT_FIELDS.find((f) => f.key === i?.path[0])?.label;
    return { line, error: `${field ? `${field}: ` : ""}${tr(i?.message ?? "Noto‘g‘ri qator")}` };
  }
  return { line, word: parsed.data };
}

export type RowStatus = "new" | "duplicate_in_file" | "exists_same" | "exists_changed" | "invalid";

export const ROW_STATUS: Record<RowStatus, { label: string; tone: "success" | "neutral" | "info" | "warning" | "danger" }> = {
  new: { get label() { return tr("Yangi"); }, tone: "success" },
  duplicate_in_file: { get label() { return tr("Faylda takror"); }, tone: "neutral" },
  exists_same: { get label() { return tr("Ro‘yxatda bor"); }, tone: "neutral" },
  exists_changed: { get label() { return tr("Ro‘yxatda bor, farqi bor"); }, tone: "warning" },
  invalid: { get label() { return tr("Xato"); }, tone: "danger" },
};

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 3 * 1024 * 1024;
