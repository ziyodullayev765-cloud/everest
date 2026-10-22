import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { isAdmin, type Actor } from "../auth/rbac";
import { forbidden, invalid, notFound } from "../errors";
import { BOOK_CATEGORIES } from "../db/schema";
import { audit } from "./audit";
import { assertOwnFiles } from "./files";
import { tr } from "@/lib/i18n/tr";

/**
 * Book library: admins upload covers, PDFs and audio tracks; every signed-in user can read
 * published books. Homework items can point at a book ("Barron's Reading — Passage 1-2").
 */

const bookInput = z.object({
  title: z.string().trim().min(2, "Kitob nomini yozing").max(200),
  author: z.string().trim().max(200).default(""),
  level: z.string().trim().max(40).default(""),
  category: z.enum(BOOK_CATEGORIES).default("other"),
  description: z.string().trim().max(5000).default(""),
  coverFileId: z.string().uuid().nullable().default(null),
  pdfFileId: z.string().uuid().nullable().default(null),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  audio: z.array(z.object({ title: z.string().trim().min(1, "Audio nomini yozing").max(200), fileId: z.string().uuid() })).max(200).default([]),
});

const requireAdmin = (a: Actor) => {
  if (!isAdmin(a)) throw forbidden(tr("Kutubxonani faqat administrator boshqaradi."));
};

export async function listBooks(actor: Actor, opts: { all?: boolean; category?: string; q?: string } = {}) {
  const manage = opts.all && isAdmin(actor);
  const conds = [manage ? ne(schema.books.status, "archived") : eq(schema.books.status, "published")];
  if (opts.category && (BOOK_CATEGORIES as readonly string[]).includes(opts.category)) conds.push(eq(schema.books.category, opts.category));
  if (opts.q) conds.push(sql`(${schema.books.title} ilike ${"%" + opts.q.replace(/[%_\\]/g, "\\$&") + "%"} or ${schema.books.author} ilike ${"%" + opts.q.replace(/[%_\\]/g, "\\$&") + "%"})`);
  return db
    .select({
      id: schema.books.id,
      title: schema.books.title,
      author: schema.books.author,
      level: schema.books.level,
      category: schema.books.category,
      status: schema.books.status,
      coverFileId: schema.books.coverFileId,
      pdfFileId: schema.books.pdfFileId,
      audioCount: sql<number>`(select count(*)::int from book_audio a where a.book_id = books.id)`,
    })
    .from(schema.books)
    .where(and(...conds))
    .orderBy(asc(schema.books.title))
    .limit(500);
}

export async function getBook(actor: Actor, id: string) {
  const [b] = await db.select().from(schema.books).where(eq(schema.books.id, id));
  if (!b || (b.status !== "published" && !isAdmin(actor))) throw notFound(tr("Kitob topilmadi."));
  const [audio, pdf] = await Promise.all([
    db
      .select({ id: schema.bookAudio.id, title: schema.bookAudio.title, fileId: schema.bookAudio.fileId, position: schema.bookAudio.position, size: schema.files.size, mime: schema.files.mime, name: schema.files.name })
      .from(schema.bookAudio)
      .innerJoin(schema.files, eq(schema.files.id, schema.bookAudio.fileId))
      .where(eq(schema.bookAudio.bookId, id))
      .orderBy(asc(schema.bookAudio.position)),
    b.pdfFileId ? db.select({ id: schema.files.id, name: schema.files.name, size: schema.files.size, mime: schema.files.mime }).from(schema.files).where(eq(schema.files.id, b.pdfFileId)) : Promise.resolve([]),
  ]);
  return { book: b, audio, pdf: pdf[0] ?? null };
}

/** Creates or replaces a book (audio list included). Archiving keeps it for old homework links. */
export async function saveBook(actor: Actor, id: string | null, input: unknown) {
  requireAdmin(actor);
  const parsed = bookInput.safeParse(input);
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? tr("Ma’lumotlar noto‘g‘ri"));
  const v = parsed.data;
  const newFiles = [v.coverFileId, v.pdfFileId, ...v.audio.map((a) => a.fileId)].filter((x): x is string => !!x);
  if (newFiles.length) {
    // Files already on this book may belong to another admin; only check the newly attached ones.
    const existing = id ? await bookFileIds(id) : [];
    await assertOwnFiles(actor.id, [...new Set(newFiles.filter((f) => !existing.includes(f)))]);
  }
  if (v.pdfFileId) {
    const [f] = await db.select({ mime: schema.files.mime }).from(schema.files).where(eq(schema.files.id, v.pdfFileId));
    if (f?.mime !== "application/pdf") throw invalid(tr("Kitob fayli PDF bo‘lishi kerak."));
  }
  if (v.coverFileId) {
    const [f] = await db.select({ mime: schema.files.mime }).from(schema.files).where(eq(schema.files.id, v.coverFileId));
    if (!f?.mime.startsWith("image/")) throw invalid(tr("Muqova rasm bo‘lishi kerak."));
  }
  if (v.audio.length) {
    const rows = await db.select({ mime: schema.files.mime }).from(schema.files).where(inArray(schema.files.id, v.audio.map((a) => a.fileId)));
    if (rows.some((r) => !r.mime.startsWith("audio/"))) throw invalid(tr("Audio treklar faqat audio fayl bo‘lishi mumkin."));
  }
  const { audio, ...row } = v;
  return db.transaction(async (tx) => {
    let bookId = id;
    if (id) {
      const [b] = await tx.select().from(schema.books).where(eq(schema.books.id, id));
      if (!b) throw notFound();
      await tx.update(schema.books).set({ ...row, updatedAt: new Date() }).where(eq(schema.books.id, id));
      await tx.delete(schema.bookAudio).where(eq(schema.bookAudio.bookId, id));
    } else {
      const [b] = await tx.insert(schema.books).values({ ...row, createdBy: actor.id }).returning({ id: schema.books.id });
      bookId = b.id;
    }
    if (audio.length) await tx.insert(schema.bookAudio).values(audio.map((a, position) => ({ bookId: bookId!, title: a.title, fileId: a.fileId, position })));
    await audit(actor.id, id ? "book.update" : "book.create", "book", bookId, { title: v.title }, tx);
    return bookId!;
  });
}

async function bookFileIds(id: string) {
  const [b] = await db.select().from(schema.books).where(eq(schema.books.id, id));
  if (!b) return [];
  const audio = await db.select({ f: schema.bookAudio.fileId }).from(schema.bookAudio).where(eq(schema.bookAudio.bookId, id));
  return [b.coverFileId, b.pdfFileId, ...audio.map((a) => a.f)].filter((x): x is string => !!x);
}

export async function setBookStatus(actor: Actor, id: string, status: "draft" | "published" | "archived") {
  requireAdmin(actor);
  await db.update(schema.books).set({ status, updatedAt: new Date() }).where(eq(schema.books.id, id));
  await audit(actor.id, `book.${status}`, "book", id);
}

/** Lightweight list for pickers (homework builder). */
export async function bookOptions() {
  return db.select({ id: schema.books.id, title: schema.books.title, category: schema.books.category }).from(schema.books).where(eq(schema.books.status, "published")).orderBy(asc(schema.books.title));
}

export async function booksByIds(ids: string[]) {
  if (!ids.length) return [];
  return db
    .select({ id: schema.books.id, title: schema.books.title, coverFileId: schema.books.coverFileId, pdfFileId: schema.books.pdfFileId, status: schema.books.status })
    .from(schema.books)
    .where(inArray(schema.books.id, ids))
    .orderBy(desc(schema.books.title));
}
