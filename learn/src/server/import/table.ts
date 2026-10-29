import "server-only";
import { inflateRawSync } from "node:zlib";
import { invalid } from "../errors";
import { parseWordList } from "@/lib/word-csv";
import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from "@/lib/vocab-import";
import { tr } from "@/lib/i18n/tr";

/**
 * Reads an uploaded vocabulary file into a plain table (rows of text cells, each with its line number
 * in the file). Formats: CSV/TSV (delimiter detected), XLSX (first sheet), JSON, and TXT in the quick
 * "word - translation" format. Nothing here touches the database.
 */

export type TableRow = { line: number; cells: string[]; error?: string };
export type Table = { format: ImportFormat; headers: string[]; rows: TableRow[]; notes: string[] };
export type ImportFormat = "csv" | "xlsx" | "json" | "txt";

export function detectFormat(fileName: string, bytes: Uint8Array): ImportFormat {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    if (ext && ext !== "xlsx") throw invalid(tr("Bu fayl Excel (.xlsx) ga o‘xshaydi, lekin nomi .{0}.", ext));
    return "xlsx";
  }
  if (ext === "xls") throw invalid(tr("Eski .xls formatini o‘qib bo‘lmaydi. Excelda “Save as → .xlsx” yoki CSV qilib saqlang."));
  if (ext === "json") return "json";
  if (ext === "csv" || ext === "tsv") return "csv";
  if (ext === "txt" || ext === "" || ext === "text") return "txt";
  throw invalid(tr("Qo‘llab-quvvatlanmaydigan fayl turi: .{0}. CSV, XLSX, JSON yoki TXT yuklang.", ext));
}

/** UTF-8 (with or without BOM) and UTF-16 with BOM; anything else is read as Windows-1251 with a note. */
export function decodeText(bytes: Uint8Array, notes: string[]): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    notes.push(tr("Fayl UTF-8 emas — Windows-1251 deb o‘qildi. Harflar buzilgan bo‘lsa, faylni UTF-8 qilib saqlang."));
    return new TextDecoder("windows-1251").decode(bytes);
  }
}

/** RFC 4180 CSV with a fixed delimiter (quotes, doubled quotes and line breaks inside quotes). */
export function parseDelimited(text: string, delim: string): { line: number; cells: string[] }[] {
  const out: { line: number; cells: string[] }[] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  let line = 1;
  let rowLine = 1;
  const push = () => {
    row.push(cell);
    if (row.some((x) => x.trim() !== "")) out.push({ line: rowLine, cells: row });
    row = [];
    cell = "";
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else {
        if (c === "\n") line++;
        cell += c;
      }
    } else if (c === '"' && cell.trim() === "") {
      q = true;
      cell = "";
    } else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      push();
      line++;
      rowLine = line;
    } else cell += c;
  }
  push();
  return out;
}

/** The delimiter that splits the first lines most consistently (tab, semicolon or comma). */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 10);
  let best = ",";
  let bestScore = -1;
  for (const d of ["\t", ";", ","]) {
    const counts = lines.map((l) => parseDelimited(l, d)[0]?.cells.length ?? 1);
    const min = Math.min(...counts);
    const score = min > 1 && counts.every((n) => n === counts[0]) ? counts[0] * 10 : min - 1;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

// ─── XLSX (zip + XML), no third-party library ────────────────────────────────

const MAX_UNZIPPED = 40 * 1024 * 1024;

function unzip(bytes: Uint8Array, wanted: (name: string) => boolean): Map<string, string> {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw invalid(tr("Excel faylini o‘qib bo‘lmadi (buzilgan yoki parol bilan himoyalangan)."));
  const entries = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map<string, string>();
  let total = 0;
  for (let e = 0; e < entries; e++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw invalid(tr("Excel faylini o‘qib bo‘lmadi."));
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    p += 46 + nameLen + extraLen + commentLen;
    if (!wanted(name)) continue;
    total += size;
    if (total > MAX_UNZIPPED) throw invalid(tr("Excel fayli juda katta."));
    if (buf.readUInt32LE(local) !== 0x04034b50) throw invalid(tr("Excel faylini o‘qib bo‘lmadi."));
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + compSize);
    const raw = method === 0 ? data : method === 8 ? inflateRawSync(data, { maxOutputLength: Math.max(size, 1) + 1024 }) : null;
    if (!raw) throw invalid(tr("Excel faylini o‘qib bo‘lmadi (noma’lum siqish usuli)."));
    files.set(name, raw.toString("utf8"));
  }
  return files;
}

const unescapeXml = (s: string) =>
  s.replace(/&(lt|gt|amp|quot|apos|#x[0-9a-f]+|#\d+);/gi, (_, e: string) =>
    e === "lt" ? "<" : e === "gt" ? ">" : e === "amp" ? "&" : e === "quot" ? '"' : e === "apos" ? "'" : String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)),
  );
const textOf = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1])).join("");
const colIndex = (ref: string) => [...ref.replace(/\d+/g, "")].reduce((n, ch) => n * 26 + ch.toUpperCase().charCodeAt(0) - 64, 0) - 1;

export function readXlsx(bytes: Uint8Array): { line: number; cells: string[] }[] {
  const files = unzip(bytes, (n) => n === "xl/workbook.xml" || n === "xl/_rels/workbook.xml.rels" || n === "xl/sharedStrings.xml" || /^xl\/worksheets\/[^/]+\.xml$/.test(n));
  // First sheet in workbook order.
  const firstRid = files.get("xl/workbook.xml")?.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const target = firstRid ? files.get("xl/_rels/workbook.xml.rels")?.match(new RegExp(`<Relationship\\b[^>]*Id="${firstRid}"[^>]*Target="([^"]+)"`))?.[1] : undefined;
  const sheetName = target ? `xl/${target.replace(/^\/?xl\//, "")}` : [...files.keys()].filter((n) => n.startsWith("xl/worksheets/")).sort()[0];
  const sheet = sheetName ? files.get(sheetName) : undefined;
  if (!sheet) throw invalid(tr("Excel faylida varaq topilmadi."));
  const shared = [...(files.get("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
  const out: { line: number; cells: string[] }[] = [];
  for (const r of sheet.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const line = Number(r[1].match(/\br="(\d+)"/)?.[1] ?? out.length + 1);
    const cells: string[] = [];
    let next = 0;
    for (const c of r[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1];
      const i = ref ? colIndex(ref) : next;
      next = i + 1;
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const body = c[2] ?? "";
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s" && v != null) value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = textOf(body);
      else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
      else if (v != null) value = unescapeXml(v);
      cells[i] = value;
    }
    const filled = Array.from(cells, (x) => x ?? "");
    if (filled.some((x) => x.trim())) out.push({ line, cells: filled });
    if (out.length > MAX_IMPORT_ROWS + 1) break;
  }
  return out;
}

// ─── JSON ───────────────────────────────────────────────────────────────────

function readJson(text: string): { headers: string[]; rows: { line: number; cells: string[] }[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw invalid(tr("JSON noto‘g‘ri: {0}", (e as Error).message.slice(0, 120)));
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const arr = Object.values(data as Record<string, unknown>).find(Array.isArray);
    if (!arr) throw invalid(tr("JSON ichida so‘zlar ro‘yxati (massiv) topilmadi."));
    data = arr;
  }
  if (!Array.isArray(data)) throw invalid(tr("JSON so‘zlar massivi bo‘lishi kerak."));
  if (data.every(Array.isArray)) return { headers: [], rows: (data as unknown[][]).map((r, i) => ({ line: i + 1, cells: r.map((x) => (x == null ? "" : String(x))) })) };
  const headers: string[] = [];
  for (const o of data) if (o && typeof o === "object") for (const k of Object.keys(o)) if (!headers.includes(k)) headers.push(k);
  if (!headers.length) throw invalid(tr("JSON’da so‘z topilmadi."));
  const str = (x: unknown) => (x == null ? "" : Array.isArray(x) ? x.join(", ") : typeof x === "object" ? JSON.stringify(x) : String(x));
  return { headers, rows: data.map((o, i) => ({ line: i + 1, cells: headers.map((h) => str((o as Record<string, unknown>)?.[h])) })) };
}

// ─── Entry point ────────────────────────────────────────────────────────────

/** `hasHeader` null = decide automatically. */
export function readTable(fileName: string, bytes: Uint8Array, looksLikeHeader: (first: string[]) => boolean): Table {
  if (bytes.byteLength === 0) throw invalid(tr("Fayl bo‘sh."));
  if (bytes.byteLength > MAX_IMPORT_BYTES) throw invalid(tr("Fayl juda katta (ko‘pi bilan 3 MB). Uni bir nechta faylga bo‘ling."));
  const format = detectFormat(fileName, bytes);
  const notes: string[] = [];
  let headers: string[] = [];
  let rows: TableRow[];
  if (format === "xlsx") rows = readXlsx(bytes);
  else {
    const text = decodeText(bytes, notes);
    if (format === "json") ({ headers, rows } = readJson(text));
    else if (format === "txt" && !/[\t;,]/.test(text.split(/\r?\n/).find((l) => l.trim()) ?? "")) {
      // Quick format: "journey - sayohat | example | misol" per line, read line by line.
      headers = ["english", "uzbek", "example", "example_uz", "phonetic", "part_of_speech"];
      rows = [];
      text.split(/\r?\n/).forEach((l, i) => {
        if (!l.trim() || rows.length > MAX_IMPORT_ROWS) return;
        const p = parseWordList(l, [], false);
        const w = p.rows[0];
        rows.push(w ? { line: i + 1, cells: [w.english, w.uzbek, w.example, w.exampleUz, w.phonetic, w.partOfSpeech] } : { line: i + 1, cells: ["", "", "", "", "", ""], error: p.errors[0]?.message ?? tr("Noto‘g‘ri qator") });
      });
      return { format, headers, rows: rows.slice(0, MAX_IMPORT_ROWS + 1), notes };
    } else rows = parseDelimited(text, detectDelimiter(text));
  }
  if (!headers.length && rows.length && looksLikeHeader(rows[0].cells)) {
    headers = rows[0].cells.map((h) => h.trim());
    rows = rows.slice(1);
  }
  if (!rows.length) throw invalid(tr("Faylda so‘z topilmadi."));
  const width = Math.max(headers.length, ...rows.map((r) => r.cells.length));
  if (!headers.length) headers = Array.from({ length: width }, (_, i) => tr("{0}-ustun", i + 1));
  else while (headers.length < width) headers.push(tr("{0}-ustun", headers.length + 1));
  if (rows.length > MAX_IMPORT_ROWS) notes.push(tr("Faylda {0} tadan ortiq qator bor — faqat birinchi {0} tasi olinadi.", MAX_IMPORT_ROWS));
  return { format, headers, rows: rows.slice(0, MAX_IMPORT_ROWS), notes };
}
