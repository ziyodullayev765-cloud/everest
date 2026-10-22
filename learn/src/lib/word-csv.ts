import { z } from "zod";
import { parseCsv } from "./utils";
import { tr } from "@/lib/i18n/tr";

export const wordInput = z.object({
  english: z.string().trim().min(1, "Inglizcha so‘z kerak").max(120),
  uzbek: z.string().trim().min(1, "Tarjima kerak").max(200),
  example: z.string().trim().max(500).default(""),
  exampleUz: z.string().trim().max(500).default(""),
  phonetic: z.string().trim().max(80).default(""),
  partOfSpeech: z.string().trim().max(30).default(""),
  difficulty: z.coerce.number().int().min(1).max(3).default(2),
  audioFileId: z.string().uuid().nullable().default(null),
  imageFileId: z.string().uuid().nullable().default(null),
});
export type WordInput = z.infer<typeof wordInput>;

export const WORD_CSV_HEADER = "english,uzbek,example,example_uz,phonetic,part_of_speech,difficulty";

export type WordImportResult = { added: number; duplicates: string[]; errors: { line: number; message: string }[] };

/** Parses and validates a CSV; nothing is written unless every row is valid. Duplicates are skipped and reported. */
export function parseWordCsv(text: string, existing: string[] = []): { rows: WordInput[]; duplicates: string[]; errors: { line: number; message: string }[] } {
  const all = parseCsv(text);
  const errors: { line: number; message: string }[] = [];
  const duplicates: string[] = [];
  const rows: WordInput[] = [];
  if (!all.length) return { rows, duplicates, errors: [{ line: 1, message: tr("Fayl bo‘sh.") }] };
  const head = all[0].map((h) => h.trim().toLowerCase());
  const hasHeader = head.includes("english");
  const idx = (n: string, fallback: number) => (hasHeader ? head.indexOf(n) : fallback);
  const cols = { english: idx("english", 0), uzbek: idx("uzbek", 1), example: idx("example", 2), exampleUz: idx("example_uz", 3), phonetic: idx("phonetic", 4), partOfSpeech: idx("part_of_speech", 5), difficulty: idx("difficulty", 6) };
  if (hasHeader && cols.uzbek < 0) return { rows, duplicates, errors: [{ line: 1, message: tr("“uzbek” ustuni kerak.") }] };
  const seen = new Set(existing.map((e) => e.trim().toLowerCase()));
  const body = hasHeader ? all.slice(1) : all;
  if (body.length > 1000) errors.push({ line: 1, message: "Bir martada ko‘pi bilan 1000 ta so‘z." });
  body.slice(0, 1000).forEach((r, i) => {
    const line = i + (hasHeader ? 2 : 1);
    const cell = (c: number) => (c >= 0 ? (r[c] ?? "").trim() : "");
    const parsed = wordInput.safeParse({
      english: cell(cols.english),
      uzbek: cell(cols.uzbek),
      example: cell(cols.example),
      exampleUz: cell(cols.exampleUz),
      phonetic: cell(cols.phonetic),
      partOfSpeech: cell(cols.partOfSpeech),
      difficulty: cell(cols.difficulty) || 2,
    });
    if (!parsed.success) return errors.push({ line, message: parsed.error.issues[0]?.message ?? "Noto‘g‘ri qator" });
    const k = parsed.data.english.toLowerCase();
    if (seen.has(k)) return duplicates.push(parsed.data.english);
    seen.add(k);
    rows.push(parsed.data);
  });
  return { rows, duplicates, errors };
}


const POS = /\s*\((n|v|adj|adv|prep|pron|conj|phr\.?\s*v|phrasal verb|noun|verb|adjective|adverb)\.?\)\s*/i;
const PHONETIC = /\s*([/[][^/\]]{1,40}[/\]])\s*/;
/** First separator between the English word and its translation: tab, " - ", "—", "–", "=", ":". */
const SEP = /\t|\s+[-–—=]\s+|\s*[–—=]\s*|\s*:\s+/;

/**
 * Quick entry: one word per line in whatever form a teacher has it —
 *   journey - sayohat        journey — sayohat, safar      1. journey (n) /ˈdʒɜːni/ : sayohat
 *   journey<TAB>sayohat<TAB>It was a long journey.        (copied from Excel / Google Sheets)
 *   journey - sayohat | It was a long journey. | Bu uzoq sayohat edi.
 * A CSV with an "english,uzbek,…" header is read as CSV. `swap` reads lines as "uzbek - english".
 */
export function parseWordList(text: string, existing: string[] = [], swap = false): { rows: WordInput[]; duplicates: string[]; errors: { line: number; message: string }[] } {
  const clean = text.replace(/^﻿/, "");
  const first = clean.split(/\r?\n/).find((l) => l.trim()) ?? "";
  if (/(^|[,;\t])\s*english\s*([,;\t]|$)/i.test(first)) return parseWordCsv(clean, existing);

  const rows: WordInput[] = [];
  const duplicates: string[] = [];
  const errors: { line: number; message: string }[] = [];
  const seen = new Set(existing.map((e) => e.trim().toLowerCase()));
  const lines = clean.split(/\r?\n/);
  if (lines.filter((l) => l.trim()).length > 1000) errors.push({ line: 1, message: "Bir martada ko‘pi bilan 1000 ta so‘z." });
  lines.slice(0, 2000).forEach((raw, i) => {
    const line = i + 1;
    const l = raw.replace(/^\s*(\d+\s*[.)]|[-•*–])\s*/, "").trim();
    if (!l) return;
    let cells: string[];
    if (l.includes("\t")) cells = l.split("\t").map((c) => c.trim());
    else {
      const m = l.match(SEP);
      if (!m || m.index === undefined || m.index === 0) return errors.push({ line, message: `Ajratuvchi topilmadi: “${l.slice(0, 40)}” (masalan: journey - sayohat)` });
      const left = l.slice(0, m.index);
      const right = l.slice(m.index + m[0].length).split(/\s+\|\s+|\|/);
      cells = [left, ...right].map((c) => c.trim());
    }
    const [first = "", second = "", example = "", exampleUz = ""] = cells;
    let english = swap ? second : first;
    const uzbek = swap ? first : second;
    let partOfSpeech = "";
    let phonetic = "";
    const pos = english.match(POS);
    if (pos) {
      partOfSpeech = pos[1].toLowerCase().replace(/\.$/, "");
      english = english.replace(POS, " ").trim();
    }
    const ph = english.match(PHONETIC);
    if (ph) {
      phonetic = ph[1];
      english = english.replace(PHONETIC, " ").trim();
    }
    const parsed = wordInput.safeParse({ english, uzbek, example, exampleUz, phonetic, partOfSpeech });
    if (!parsed.success) return errors.push({ line, message: parsed.error.issues[0]?.message ?? "Noto‘g‘ri qator" });
    const k = parsed.data.english.toLowerCase();
    if (seen.has(k)) return duplicates.push(parsed.data.english);
    seen.add(k);
    rows.push(parsed.data);
  });
  if (!rows.length && !errors.length && !duplicates.length) errors.push({ line: 1, message: "Matn bo‘sh." });
  return { rows, duplicates, errors };
}
