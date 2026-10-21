import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { sha256 } from "../crypto";
import { env } from "../env";
import { invalid, notFound, forbidden } from "../errors";
import { isAdmin, isStaff, type Actor } from "../auth/rbac";
import { assertStudentCanSee, canManageAssignment, canViewStudent } from "./access";

type Kind = { mime: string; ext: string[]; image?: boolean };

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
];

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
  if (ext === "txt") {
    // Plain UTF-8 text without NUL bytes.
    if (buf.includes(0)) return null;
    return KINDS[8];
  }
  return null;
}

export const ALLOWED_EXTENSIONS = KINDS.flatMap((k) => k.ext);

export function safeFilename(name: string) {
  const base = name.normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim().slice(-120);
  return base || "fayl";
}

export async function storeFile(actor: Actor, file: File, opts: { visibility?: "public" | "private"; imagesOnly?: boolean } = {}) {
  if (file.size <= 0) throw invalid("Fayl bo‘sh.");
  if (file.size > env.maxUploadBytes) throw invalid(`Fayl hajmi ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB dan oshmasligi kerak.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const name = safeFilename(file.name);
  const kind = sniff(buf, name);
  if (!kind) throw invalid(`Bu fayl turi qo‘llab-quvvatlanmaydi. Ruxsat etilgan: ${ALLOWED_EXTENSIONS.join(", ")}.`);
  if (opts.imagesOnly && !kind.image) throw invalid("Faqat rasm yuklash mumkin (PNG, JPG, WebP, GIF).");
  if (opts.visibility === "public" && !isStaff(actor)) throw forbidden();
  const [row] = await db
    .insert(schema.files)
    .values({ ownerId: actor.id, name, mime: kind.mime, size: buf.length, sha256: sha256(buf), visibility: opts.visibility ?? "private", data: buf })
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

  const attached = await db.execute<{ assignment_id: string }>(sql`
    select assignment_id from assignment_attachments where file_id = ${fileId}
    union select assignment_id from questions where image_file_id = ${fileId} and assignment_id is not null`);
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
