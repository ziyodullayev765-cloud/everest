import "server-only";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema, type Executor } from "../db";
import { isAdmin, isStudent, type Actor } from "../auth/rbac";
import { forbidden, invalid, notFound } from "../errors";
import { readTable, type Table } from "../import/table";
import { audit } from "./audit";
import { assertTargetsInScope } from "./assignments";
import { enforce } from "./rate-limit";
import { loadList, notifyTargets } from "./vocabulary";
import { IMPORT_FIELDS, guessMapping, looksLikeHeader, rowToWord, type ColumnMapping, type ImportField, type RowStatus } from "@/lib/vocab-import";
import type { WordInput } from "@/lib/word-csv";
import type { ImportRowError } from "../db/schema";
import { tr } from "@/lib/i18n/tr";

/**
 * Vocabulary import: preview (parse + validate + compare with the set, nothing written) and run
 * (one transaction: words, assignments, job record — all or nothing), import history and undo.
 */

const FIELD_KEYS = IMPORT_FIELDS.map((f) => f.key) as [ImportField, ...ImportField[]];
/** Fields compared to decide whether an existing word differs from the imported one. */
const COMPARED: (keyof WordInput)[] = ["uzbek", "definition", "example", "exampleUz", "partOfSpeech", "phonetic", "synonyms", "unit", "tags"];
const CHUNK = 500;

const sourceInput = z.object({
  fileName: z.string().trim().max(200).default("pasted.txt"),
  /** base64 file contents, or pasted text. */
  base64: z.string().max(5_000_000).optional(),
  text: z.string().max(3_000_000).optional(),
  mapping: z.array(z.enum(["", ...FIELD_KEYS])).max(60).optional(),
});

function readSource(v: z.infer<typeof sourceInput>): Table {
  if (!v.base64 && !v.text) throw invalid(tr("Fayl tanlang yoki matnni kiriting."));
  const bytes = v.base64 ? new Uint8Array(Buffer.from(v.base64, "base64")) : new TextEncoder().encode(v.text);
  return readTable(v.base64 ? v.fileName : "pasted.txt", bytes, looksLikeHeader);
}

function checkMapping(m: ColumnMapping, width: number): ColumnMapping {
  const mapping = Array.from({ length: width }, (_, i) => m[i] ?? "");
  for (const f of ["english", "uzbek"] as const) if (!mapping.includes(f)) throw invalid(tr("“{0}” ustunini tanlang.", IMPORT_FIELDS.find((x) => x.key === f)!.label));
  const dup = mapping.find((f, i) => f && mapping.indexOf(f) !== i);
  if (dup) throw invalid(tr("“{0}” ikki ustunga tanlangan.", IMPORT_FIELDS.find((x) => x.key === dup)!.label));
  return mapping;
}

type Existing = { id: string } & Pick<typeof schema.words.$inferSelect, "english" | "uzbek" | "definition" | "example" | "exampleUz" | "partOfSpeech" | "phonetic" | "synonyms" | "unit" | "tags" | "difficulty">;
export type AnalyzedRow = { line: number; status: RowStatus; english: string; uzbek: string; message?: string; word?: WordInput; existingId?: string; changes?: string[] };

function analyze(table: Table, mapping: ColumnMapping, existing: Existing[]): AnalyzedRow[] {
  const byEnglish = new Map(existing.map((e) => [e.english.trim().toLowerCase(), e]));
  const seen = new Set<string>();
  return table.rows.map((r) => {
    if (r.error) return { line: r.line, status: "invalid", english: "", uzbek: "", message: r.error };
    const p = rowToWord(r.cells, mapping, r.line);
    const en = (r.cells[mapping.indexOf("english")] ?? "").trim();
    const uz = (r.cells[mapping.indexOf("uzbek")] ?? "").trim();
    if (!p.word) return { line: r.line, status: "invalid", english: en, uzbek: uz, message: p.error };
    const w = p.word;
    const key = w.english.toLowerCase();
    if (seen.has(key)) return { line: r.line, status: "duplicate_in_file", english: w.english, uzbek: w.uzbek, message: tr("Faylda yuqorida bor") };
    seen.add(key);
    const ex = byEnglish.get(key);
    if (!ex) return { line: r.line, status: "new", english: w.english, uzbek: w.uzbek, word: w };
    // Only fields the file actually fills count as changes; blanks never wipe existing data.
    const changes = COMPARED.filter((f) => mapping.includes(f as ImportField) && String(w[f] ?? "") !== "" && String(w[f]) !== String(ex[f as keyof Existing] ?? ""));
    if (mapping.includes("difficulty") && w.difficulty !== ex.difficulty) changes.push("difficulty");
    return changes.length
      ? { line: r.line, status: "exists_changed", english: w.english, uzbek: w.uzbek, word: w, existingId: ex.id, changes, message: tr("Hozir: {0}", ex.uzbek) }
      : { line: r.line, status: "exists_same", english: w.english, uzbek: w.uzbek, existingId: ex.id };
  });
}

/** Same file content + same column mapping → same hash, whatever the set already holds. */
const hashTable = (table: Table, mapping: ColumnMapping) =>
  createHash("sha256")
    .update(JSON.stringify([mapping, table.rows.map((r) => r.cells.map((c) => c.trim()))]))
    .digest("hex");

async function existingWords(listId: string | null, ex: Executor = db): Promise<Existing[]> {
  if (!listId) return [];
  const w = schema.words;
  return ex
    .select({ id: w.id, english: w.english, uzbek: w.uzbek, definition: w.definition, example: w.example, exampleUz: w.exampleUz, partOfSpeech: w.partOfSpeech, phonetic: w.phonetic, synonyms: w.synonyms, unit: w.unit, tags: w.tags, difficulty: w.difficulty })
    .from(w)
    .where(and(eq(w.listId, listId), isNull(w.archivedAt)));
}

const count = (rows: AnalyzedRow[]) => {
  const c: Record<RowStatus, number> = { new: 0, duplicate_in_file: 0, exists_same: 0, exists_changed: 0, invalid: 0 };
  for (const r of rows) c[r.status]++;
  return c;
};

/** Parses and checks a file against a set without writing anything. */
export async function previewImport(actor: Actor, input: unknown) {
  if (isStudent(actor)) throw forbidden();
  const v = sourceInput.extend({ listId: z.string().uuid().nullable().default(null) }).parse(input);
  if (v.listId) await loadList(actor, v.listId, true);
  const table = readSource(v);
  const mapping = v.mapping ? Array.from({ length: table.headers.length }, (_, i) => v.mapping![i] ?? "") : guessMapping(table.headers);
  const ready = mapping.includes("english") && mapping.includes("uzbek");
  const rows = ready ? analyze(table, mapping, await existingWords(v.listId)) : [];
  const hash = ready ? hashTable(table, mapping) : null;
  const [prev] =
    hash && v.listId
      ? await db
          .select({ id: schema.importJobs.id, createdAt: schema.importJobs.createdAt })
          .from(schema.importJobs)
          .where(and(eq(schema.importJobs.listId, v.listId), eq(schema.importJobs.contentHash, hash), eq(schema.importJobs.status, "done")))
          .orderBy(desc(schema.importJobs.createdAt))
          .limit(1)
      : [];
  return {
    format: table.format,
    headers: table.headers,
    sample: table.rows.slice(0, 5).map((r) => r.cells),
    mapping,
    ready,
    notes: table.notes,
    counts: count(rows),
    total: table.rows.length,
    rows: rows.slice(0, 300).map((r) => ({ line: r.line, status: r.status, english: r.english, uzbek: r.uzbek, message: r.message, changes: r.changes })),
    previousImport: prev ? { id: prev.id, at: prev.createdAt } : null,
  };
}

const runInput = sourceInput.extend({
  mapping: z.array(z.enum(["", ...FIELD_KEYS])).max(60),
  listId: z.string().uuid().nullable().default(null),
  newList: z.object({ title: z.string().trim().min(2, "Ro‘yxat nomi kerak").max(120), level: z.string().trim().max(40).default(""), topic: z.string().trim().max(120).default("") }).nullable().default(null),
  classIds: z.array(z.string().uuid()).max(100).default([]),
  policy: z.enum(["skip", "update"]).default("skip"),
  publish: z.boolean().default(false),
});

/**
 * Imports in one transaction: the set row is locked so two imports into the same set run one after the
 * other; words go in chunks; assignments are added (existing ones stay). Invalid rows are reported,
 * never silently dropped. If anything fails, nothing is written and a failed job is recorded.
 */
export async function runImport(actor: Actor, input: unknown) {
  if (isStudent(actor)) throw forbidden();
  const v = runInput.parse(input);
  if (!v.listId && !v.newList) throw invalid(tr("Ro‘yxatni tanlang yoki yangisini yarating."));
  await enforce(`vocab-import:${actor.id}`, 30, 3600);
  const table = readSource(v);
  const mapping = checkMapping(v.mapping, table.headers.length);
  const classIds = [...new Set(v.classIds)];
  try {
    return await db.transaction(async (tx) => {
      let listId = v.listId;
      let title: string;
      let wasPublished = false;
      if (listId) {
        const l = await loadList(actor, listId, true, tx, true);
        title = l.title;
        wasPublished = l.status === "published";
      } else {
        const [l] = await tx.insert(schema.wordLists).values({ ...v.newList!, createdBy: actor.id, updatedBy: actor.id }).returning({ id: schema.wordLists.id });
        listId = l.id;
        title = v.newList!.title;
        await audit(actor.id, "vocab.list_create", "word_list", listId, { title }, tx);
      }
      await assertTargetsInScope(actor, classIds, [], tx);
      const rows = analyze(table, mapping, await existingWords(listId, tx));
      const c = count(rows);
      const toAdd = rows.filter((r) => r.status === "new");
      const toUpdate = v.policy === "update" ? rows.filter((r) => r.status === "exists_changed") : [];
      const errors: ImportRowError[] = rows
        .filter((r) => r.status !== "new" && !(r.status === "exists_changed" && v.policy === "update"))
        .map((r) => ({ line: r.line, kind: r.status === "invalid" ? "error" : "skipped", value: r.english, message: r.status === "invalid" ? (r.message ?? tr("Noto‘g‘ri qator")) : r.status === "exists_changed" ? tr("Ro‘yxatda bor, farqi bor — o‘tkazib yuborildi ({0})", r.message ?? "") : r.status === "exists_same" ? tr("Ro‘yxatda bor — o‘tkazib yuborildi") : tr("Faylda takror — o‘tkazib yuborildi") }));
      const [job] = await tx
        .insert(schema.importJobs)
        .values({
          listId,
          createdBy: actor.id,
          fileName: v.base64 ? v.fileName : tr("Qo‘lda kiritilgan matn"),
          format: table.format,
          contentHash: hashTable(table, mapping),
          policy: v.policy,
          classIds,
          total: rows.length,
          added: toAdd.length,
          updated: toUpdate.length,
          skipped: rows.length - toAdd.length - toUpdate.length - c.invalid,
          failed: c.invalid,
          errors: errors.slice(0, 2000),
        })
        .returning({ id: schema.importJobs.id });

      const start = (await tx.select({ n: sql<number>`coalesce(max(position), -1)::int + 1` }).from(schema.words).where(eq(schema.words.listId, listId)))[0]?.n ?? 0;
      for (let i = 0; i < toAdd.length; i += CHUNK)
        await tx.insert(schema.words).values(toAdd.slice(i, i + CHUNK).map((r, k) => ({ ...r.word!, listId: listId!, position: start + i + k, importJobId: job.id })));

      const previous: Record<string, Record<string, unknown>> = {};
      if (toUpdate.length) {
        const current = new Map((await existingWords(listId, tx)).map((e) => [e.id, e]));
        for (const r of toUpdate) {
          const before = current.get(r.existingId!)!;
          const set: Record<string, unknown> = {};
          for (const f of r.changes ?? []) set[f] = r.word![f as keyof WordInput];
          previous[r.existingId!] = Object.fromEntries(Object.keys(set).map((k) => [k, before[k as keyof Existing]]));
          await tx.update(schema.words).set({ ...set, updatedAt: new Date() }).where(eq(schema.words.id, r.existingId!));
        }
        await tx.update(schema.importJobs).set({ previous }).where(eq(schema.importJobs.id, job.id));
      }

      if (classIds.length) await tx.insert(schema.wordListTargets).values(classIds.map((classId) => ({ listId: listId!, classId }))).onConflictDoNothing();
      const live = (await tx.select({ n: sql<number>`count(*)::int` }).from(schema.words).where(and(eq(schema.words.listId, listId), isNull(schema.words.archivedAt))))[0]?.n ?? 0;
      const publish = v.publish && !wasPublished && live > 0;
      await tx.update(schema.wordLists).set({ updatedAt: new Date(), updatedBy: actor.id, ...(publish ? { status: "published" } : {}) }).where(eq(schema.wordLists.id, listId));
      await audit(actor.id, "vocab.import", "word_list", listId, { job: job.id, added: toAdd.length, updated: toUpdate.length, failed: c.invalid, groups: classIds.length }, tx);
      return { jobId: job.id, listId, title, notify: publish || (wasPublished && (classIds.length > 0 || toAdd.length > 0)) };
    });
  } catch (e) {
    // Record the failure against an existing set (a new set was rolled back with everything else).
    if (v.listId) {
      await db
        .insert(schema.importJobs)
        .values({ listId: v.listId, createdBy: actor.id, fileName: v.base64 ? v.fileName : tr("Qo‘lda kiritilgan matn"), format: table.format, contentHash: "", policy: v.policy, classIds, status: "failed", total: table.rows.length, failed: table.rows.length, errors: [{ line: 0, kind: "error", message: e instanceof Error ? e.message.slice(0, 300) : String(e) }] })
        .catch((err) => console.error("[import] could not record failed job", err));
    }
    throw e;
  }
}

/** Sends "new vocabulary" notifications after a successful import (outside the transaction). */
export async function afterImport(r: { listId: string; title: string; notify: boolean }) {
  if (r.notify) await notifyTargets(r.listId, r.title);
}

function jobScope(actor: Actor) {
  if (isStudent(actor)) throw forbidden();
  return isAdmin(actor) ? sql`true` : eq(schema.importJobs.createdBy, actor.id);
}

export async function listImports(actor: Actor, f: { listId?: string; status?: string; limit?: number } = {}) {
  const j = schema.importJobs;
  return db
    .select({ id: j.id, listId: j.listId, listTitle: schema.wordLists.title, fileName: j.fileName, format: j.format, status: j.status, total: j.total, added: j.added, updated: j.updated, skipped: j.skipped, failed: j.failed, policy: j.policy, classIds: j.classIds, createdAt: j.createdAt, revertedAt: j.revertedAt, author: schema.users.displayName })
    .from(j)
    .innerJoin(schema.wordLists, eq(schema.wordLists.id, j.listId))
    .innerJoin(schema.users, eq(schema.users.id, j.createdBy))
    .where(and(jobScope(actor), f.listId ? eq(j.listId, f.listId) : sql`true`, f.status ? eq(j.status, f.status) : sql`true`))
    .orderBy(desc(j.createdAt))
    .limit(Math.min(f.limit ?? 100, 500));
}

export async function getImport(actor: Actor, id: string) {
  const [row] = await db
    .select({ job: schema.importJobs, listTitle: schema.wordLists.title, author: schema.users.displayName })
    .from(schema.importJobs)
    .innerJoin(schema.wordLists, eq(schema.wordLists.id, schema.importJobs.listId))
    .innerJoin(schema.users, eq(schema.users.id, schema.importJobs.createdBy))
    .where(and(eq(schema.importJobs.id, id), jobScope(actor)));
  if (!row) throw notFound(tr("Import topilmadi."));
  const groups = row.job.classIds.length ? await db.select({ id: schema.classes.id, name: schema.classes.name }).from(schema.classes).where(inArray(schema.classes.id, row.job.classIds)) : [];
  return { ...row, groups };
}

/**
 * Undo: words this import added are deleted (or archived if a student already studied them, so their
 * history stays); words it changed get their previous values back. Group assignments are kept.
 */
export async function revertImport(actor: Actor, id: string) {
  const { job } = await getImport(actor, id);
  await loadList(actor, job.listId, true);
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(schema.importJobs).where(eq(schema.importJobs.id, id)).for("update");
    if (cur.status !== "done") throw invalid(cur.status === "reverted" ? tr("Bu import allaqachon bekor qilingan.") : tr("Muvaffaqiyatsiz importni bekor qilib bo‘lmaydi."));
    const added = await tx.select({ id: schema.words.id }).from(schema.words).where(eq(schema.words.importJobId, id));
    const ids = added.map((w) => w.id);
    let archived = 0;
    let removed = 0;
    if (ids.length) {
      const used = await tx.execute<{ id: string }>(sql`select distinct word_id as id from vocab_progress where word_id in ${ids} union select distinct word_id from vocab_reviews where word_id in ${ids}`);
      const usedIds = used.map((u) => u.id);
      const free = ids.filter((x) => !usedIds.includes(x));
      if (usedIds.length) await tx.update(schema.words).set({ archivedAt: new Date(), updatedAt: new Date() }).where(inArray(schema.words.id, usedIds));
      if (free.length) await tx.delete(schema.words).where(inArray(schema.words.id, free));
      archived = usedIds.length;
      removed = free.length;
    }
    for (const [wordId, prev] of Object.entries(cur.previous)) await tx.update(schema.words).set({ ...prev, updatedAt: new Date() }).where(eq(schema.words.id, wordId));
    await tx.update(schema.importJobs).set({ status: "reverted", revertedAt: new Date(), revertedBy: actor.id }).where(eq(schema.importJobs.id, id));
    await tx.update(schema.wordLists).set({ updatedAt: new Date(), updatedBy: actor.id }).where(eq(schema.wordLists.id, cur.listId));
    await audit(actor.id, "vocab.import_revert", "word_list", cur.listId, { job: id, removed, archived, restored: Object.keys(cur.previous).length }, tx);
    return { removed, archived, restored: Object.keys(cur.previous).length };
  });
}

/** CSV report of rows an import did not write (errors and skipped duplicates). */
export async function importReportCsv(actor: Actor, id: string) {
  const { job, listTitle } = await getImport(actor, id);
  const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const lines = [["line", "type", "word", "message"].join(","), ...job.errors.map((e) => [e.line, e.kind ?? "error", esc(e.value), esc(e.message)].join(","))];
  return { name: `import-${listTitle.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40)}-${job.createdAt.toISOString().slice(0, 10)}.csv`, body: "﻿" + lines.join("\r\n") + "\r\n" };
}
