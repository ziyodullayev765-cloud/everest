import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { sha256 } from "../crypto";
import { env } from "../env";
import { invalid, notFound, forbidden } from "../errors";
import { isAdmin, isStaff, type Actor } from "../auth/rbac";
import { assertStudentCanSee, canManageAssignment, canViewStudent } from "./access";

type Kind = { mime: string; ext: string[]; image?: boolean; audio?: boolean };

const KINDS: Kind[] = [
  { mime: "application/pdf", ext: ["pdf"] },
  { mime: "image/png", ext: ["png"], image: true },
  { mime: "image/jpeg", ext: ["jpg", "jpeg"], image: true },
  { mime: "image/webp", ext: ["webp"], image: true },
  { mime: "image/gif", ext: ["gif"], image: true },
  { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: ["docx"] },
  { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ["xlsx"] },
  { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: ["pptx"] },
  { mime: "text/plain", ext: ["txt"] },
  { mime: "audio/mpeg", ext: ["mp3"], audio: true },
  { mime: "audio/mp4", ext: ["m4a", "mp4", "aac"], audio: true },
  { mime: "audio/wav", ext: ["wav"], audio: true },
  { mime: "audio/ogg", ext: ["ogg", "oga", "opus"], audio: true },
  { mime: "audio/webm", ext: ["webm"], audio: true },
  { mime: "audio/aac", ext: ["aac"], audio: true },
];
const kind = (mime: string) => KINDS.find((k) => k.mime === mime)!;

/** Detect the real type from magic bytes; the browser-supplied MIME type is never trusted. */
export function sniff(buf: Buffer, filename: string): Kind | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const starts = (...b: number[]) => b.every((x, i) => buf[i] === x);
  if (starts(0x25, 0x50, 0x44, 0x46)) return KINDS[0];
  if (starts(0x89, 0x50, 0x4e, 0x47)) return KINDS[1];
  if (starts(0xff, 0xd8, 0xff)) return KINDS[2];
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return KINDS[3];
  if (buf.subarray(0, 4).toString() === "GIF8") return KINDS[4];
  if (starts(0x50, 0x4b, 0x03, 0x04)) {
    const k = KINDS.find((x) => x.ext.includes(ext) && ["docx", "xlsx", "pptx"].includes(ext));
    return k ?? null;
  }
  // Audio
  if (buf.subarray(0, 3).toString("latin1") === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe6) === 0xe2)) return kind("audio/mpeg");
  if (buf.subarray(4, 8).toString("latin1") === "ftyp") return ["m4a", "mp4", "aac"].includes(ext) ? kind("audio/mp4") : null;
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WAVE") return kind("audio/wav");
  if (buf.subarray(0, 4).toString("latin1") === "OggS") return kind("audio/ogg");
  if (starts(0x1a, 0x45, 0xdf, 0xa3)) return kind("audio/webm");
  if (buf[0] === 0xff && (buf[1] & 0xf6) === 0xf0) return kind("audio/aac");
  if (ext === "txt") {
    // Plain UTF-8 text without NUL bytes.
    if (buf.includes(0)) return null;
    return kind("text/plain");
  }
  return null;
}

export const ALLOWED_EXTENSIONS = [...new Set(KINDS.flatMap((k) => k.ext))];
export const ALLOWED_MIME = KINDS.map((k) => k.mime);
export const IMAGE_MIME = KINDS.filter((k) => k.image).map((k) => k.mime);
export const AUDIO_MIME = KINDS.filter((k) => k.audio).map((k) => k.mime);

export function safeFilename(name: string) {
  const base = name.normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim().slice(-120);
  return base || "fayl";
}

export type UploadOpts = { visibility?: "public" | "private"; imagesOnly?: boolean };

function checkKind(k: Kind | null, opts: UploadOpts, actor: Actor) {
  if (!k) throw invalid(`Bu fayl turi qo‘llab-quvvatlanmaydi. Ruxsat etilgan: ${ALLOWED_EXTENSIONS.join(", ")}.`);
  if (opts.imagesOnly && !k.image) throw invalid("Faqat rasm yuklash mumkin (PNG, JPG, WebP, GIF).");
  if (opts.visibility === "public" && !isStaff(actor)) throw forbidden();
  return k;
}

export async function storeFile(actor: Actor, file: File, opts: UploadOpts = {}) {
  if (file.size <= 0) throw invalid("Fayl bo‘sh.");
  if (file.size > env.maxUploadBytes) throw invalid(`Fayl hajmi ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB dan oshmasligi kerak.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const name = safeFilename(file.name);
  const k = checkKind(sniff(buf, name), opts, actor);
  const [row] = await db
    .insert(schema.files)
    .values({ ownerId: actor.id, name, mime: k.mime, size: buf.length, sha256: sha256(buf), visibility: opts.visibility ?? "private", data: buf })
    .returning({ id: schema.files.id, name: schema.files.name, mime: schema.files.mime, size: schema.files.size });
  return row;
}

/**
 * A file may be read by: its owner; anyone if public; staff managing an assignment it is attached to;
 * students who can see that assignment; staff who can view the student whose submission contains it.
 */
export async function authorizeFileRead(actor: Actor | null, fileId: string) {
  const rows = await db.select().from(schema.files).where(eq(schema.files.id, fileId)).limit(1);
  const f = rows[0];
  if (!f) throw notFound();
  if (f.visibility === "public") return f;
  if (!actor) throw notFound();
  if (f.ownerId === actor.id || isAdmin(actor)) return f;

  // Library: covers, PDFs and audio of published books are readable by every signed-in user.
  const lib = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from books b
    where b.status = 'published' and (b.cover_file_id = ${fileId} or b.pdf_file_id = ${fileId}
      or exists (select 1 from book_audio a where a.book_id = b.id and a.file_id = ${fileId}))`);
  if ((lib[0]?.n ?? 0) > 0) return f;

  const attached = await db.execute<{ assignment_id: string }>(sql`
    select assignment_id from assignment_attachments where file_id = ${fileId}
    union select id from assignments where audio_file_id = ${fileId}
    union select assignment_id from questions where assignment_id is not null
      and (image_file_id = ${fileId} or config->>'audioFileId' = ${fileId}::text)`);
  for (const r of attached) {
    if (isStaff(actor) && (await canManageAssignment(actor, r.assignment_id))) return f;
    if (actor.role === "student") {
      try {
        await assertStudentCanSee(actor.id, r.assignment_id);
        return f;
      } catch {
        /* keep checking */
      }
    }
  }
  // Vocabulary: a word's picture / pronunciation, for staff and for students the list is published to.
  const word = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from words w join word_lists l on l.id = w.list_id
    where w.archived_at is null and (w.audio_file_id = ${fileId} or w.image_file_id = ${fileId})
      and (${isStaff(actor)} or (l.status = 'published' and exists (
        select 1 from word_list_targets t where t.list_id = l.id and (t.student_id = ${actor.id}
          or t.class_id in (select class_id from class_students where student_id = ${actor.id})))))`);
  if ((word[0]?.n ?? 0) > 0) return f;

  if (isStaff(actor)) {
    const subs = await db
      .select({ studentId: schema.submissions.studentId, assignmentId: schema.submissions.assignmentId })
      .from(schema.submissionFiles)
      .innerJoin(schema.submissions, eq(schema.submissions.id, schema.submissionFiles.submissionId))
      .where(eq(schema.submissionFiles.fileId, fileId));
    for (const s of subs) {
      if ((await canViewStudent(actor, s.studentId)) && (await canManageAssignment(actor, s.assignmentId))) return f;
    }
    // Staff may see avatars of users they can view.
    const av = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.avatarFileId, fileId)).limit(1);
    if (av[0] && (await canViewStudent(actor, av[0].id))) return f;
  }
  throw notFound();
}

/** Validates that file ids belong to the actor (prevents attaching someone else's upload). */
export async function assertOwnFiles(actorId: string, fileIds: string[]) {
  if (fileIds.length === 0) return;
  const rows = await db
    .select({ id: schema.files.id })
    .from(schema.files)
    .where(and(eq(schema.files.ownerId, actorId), inArray(schema.files.id, fileIds)));
  if (rows.length !== new Set(fileIds).size) throw invalid("Fayl topilmadi.");
}

export async function fileMeta(ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select({ id: schema.files.id, name: schema.files.name, mime: schema.files.mime, size: schema.files.size })
    .from(schema.files)
    .where(inArray(schema.files.id, ids));
}

// ─── Large files in Vercel Blob (private store) ──────────────────────────────

export const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;
/** Upload size caps for direct-to-storage uploads (books and audio are large). */
export const blobMaxBytes = (a: Actor) => (isStaff(a) ? 300 * 1024 * 1024 : 50 * 1024 * 1024);
export const blobPrefix = (a: Actor) => `u/${a.id}/`;

/**
 * Registers a file the browser uploaded straight to the private Blob store. The pathname must live
 * under the uploader's own prefix; the type is re-checked from the first bytes (never trusting the
 * client's MIME type) and anything that fails is deleted from storage.
 */
export async function registerBlob(actor: Actor, input: { pathname: string; name: string }, opts: UploadOpts = {}) {
  if (!blobEnabled()) throw invalid("Katta fayllar ombori sozlanmagan.");
  const { get, head, del } = await import("@vercel/blob");
  const pathname = String(input.pathname ?? "");
  if (!pathname.startsWith(blobPrefix(actor)) || pathname.includes("..") || pathname.length > 300) throw forbidden();
  const name = safeFilename(String(input.name ?? "fayl"));
  const meta = await head(pathname).catch(() => null);
  if (!meta) throw notFound("Yuklangan fayl topilmadi.");
  const reject = async (e: Error) => {
    await del(pathname).catch(() => {});
    throw e;
  };
  if (meta.size <= 0) return reject(invalid("Fayl bo‘sh."));
  if (meta.size > blobMaxBytes(actor)) return reject(invalid("Fayl juda katta."));
  const res = await get(pathname, { access: "private", headers: { Range: "bytes=0-63" } });
  if (!res || res.statusCode !== 200) return reject(invalid("Fayl o‘qilmadi."));
  const first = Buffer.from(await new Response(res.stream).arrayBuffer()).subarray(0, 64);
  let k: Kind;
  try {
    k = checkKind(sniff(first, name), opts, actor);
  } catch (e) {
    return reject(e as Error);
  }
  const [row] = await db
    .insert(schema.files)
    .values({ ownerId: actor.id, name, mime: k.mime, size: meta.size, sha256: `blob:${meta.etag ?? pathname}`.slice(0, 120), visibility: opts.visibility ?? "private", storage: "blob", blobUrl: meta.url })
    .returning({ id: schema.files.id, name: schema.files.name, mime: schema.files.mime, size: schema.files.size });
  return row;
}

/** Streams a stored file, honouring HTTP Range (needed for audio seeking, required by iOS Safari). */
export async function openFile(f: typeof schema.files.$inferSelect, range: string | null): Promise<{ status: number; body: BodyInit; headers: Record<string, string> }> {
  const m = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (f.storage === "blob") {
    const { get } = await import("@vercel/blob");
    const res = await get(f.blobUrl!, { access: "private", headers: m ? { Range: range! } : undefined });
    if (!res || res.statusCode !== 200) throw notFound();
    const cr = res.headers.get("content-range");
    const len = res.headers.get("content-length");
    return { status: cr ? 206 : 200, body: res.stream, headers: { ...(cr ? { "Content-Range": cr } : {}), ...(len ? { "Content-Length": len } : {}), "Accept-Ranges": "bytes" } };
  }
  const data = f.data!;
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : Math.max(0, data.length - Number(m[2]));
    let end = m[1] && m[2] ? Number(m[2]) : data.length - 1;
    end = Math.min(end, data.length - 1);
    if (start > end || start >= data.length) return { status: 416, body: "", headers: { "Content-Range": `bytes */${data.length}` } };
    start = Math.max(0, start);
    return { status: 206, body: new Uint8Array(data.subarray(start, end + 1)), headers: { "Content-Range": `bytes ${start}-${end}/${data.length}`, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } };
  }
  return { status: 200, body: new Uint8Array(data), headers: { "Content-Length": String(data.length), "Accept-Ranges": "bytes" } };
}
