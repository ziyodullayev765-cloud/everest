import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema, type Executor } from "../db";
import { isAdmin, isStudent, type Actor } from "../auth/rbac";
import { forbidden, invalid, isUniqueViolation, notFound } from "../errors";
import { audit } from "./audit";
import { manageableClassIds } from "./access";
import { assertTargetsInScope } from "./assignments";
import { assertOwnFiles } from "./files";
import { notify } from "./notifications";
import { enforce } from "./rate-limit";
import { gradeFor, matchesAnswer, schedule, type SrsGrade } from "@/lib/srs";
import { GAME_ROUND, gameScore } from "@/lib/game";
import { parseWordList, wordInput, type WordImportResult, type WordInput } from "@/lib/word-csv";
import { tr } from "@/lib/i18n/tr";
export type { WordImportResult } from "@/lib/word-csv";

const TZ = "Asia/Tashkent";

// ─── Staff: lists and words ──────────────────────────────────────────────────

const requireStaff = (a: Actor) => {
  if (isStudent(a)) throw forbidden();
};

const listInput = z.object({
  title: z.string().trim().min(2, "Ro‘yxat nomi kerak").max(120),
  description: z.string().trim().max(2000).default(""),
  level: z.string().trim().max(40).default(""),
  topic: z.string().trim().max(120).default(""),
});



/** Teachers edit their own lists; admins edit all. Everyone on staff may view and assign published lists. */
export async function loadList(actor: Actor, id: string, forEdit: boolean, ex: Executor = db, lock = false) {
  requireStaff(actor);
  const q = ex.select().from(schema.wordLists).where(eq(schema.wordLists.id, id));
  const [l] = lock ? await q.for("update") : await q;
  if (!l) throw notFound(tr("Ro‘yxat topilmadi."));
  if (forEdit && !isAdmin(actor) && l.createdBy !== actor.id) throw forbidden(tr("Bu ro‘yxatni faqat muallif yoki administrator tahrirlaydi."));
  if (!forEdit && !isAdmin(actor) && l.createdBy !== actor.id && l.status !== "published") throw notFound(tr("Ro‘yxat topilmadi."));
  return l;
}

export type WordListFilter = { q?: string; status?: string; classId?: string; unassigned?: boolean; page?: number };
export const LISTS_PER_PAGE = 50;

/** Sets visible to the actor with words/assignment counts and the groups (in the actor's scope) using each. */
export async function listWordLists(actor: Actor, f: WordListFilter = {}) {
  requireStaff(actor);
  const scope = await manageableClassIds(actor);
  const inScope = scope === "all" ? sql`true` : scope.length ? sql`t.class_id in ${scope}` : sql`false`;
  const conds = [
    isAdmin(actor) ? sql`true` : sql`(${schema.wordLists.createdBy} = ${actor.id} or ${schema.wordLists.status} = 'published')`,
    f.status ? eq(schema.wordLists.status, f.status) : sql`${schema.wordLists.status} <> 'archived'`,
    f.q ? sql`(${schema.wordLists.title} ilike ${"%" + f.q + "%"} or ${schema.wordLists.topic} ilike ${"%" + f.q + "%"} or ${schema.wordLists.level} ilike ${"%" + f.q + "%"})` : sql`true`,
    f.classId ? sql`exists (select 1 from word_list_targets t where t.list_id = word_lists.id and t.class_id = ${f.classId})` : sql`true`,
    f.unassigned ? sql`not exists (select 1 from word_list_targets t where t.list_id = word_lists.id)` : sql`true`,
  ];
  const where = and(...conds);
  const page = Math.max(1, Math.floor(f.page ?? 1));
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: schema.wordLists.id,
        title: schema.wordLists.title,
        level: schema.wordLists.level,
        topic: schema.wordLists.topic,
        status: schema.wordLists.status,
        createdBy: schema.wordLists.createdBy,
        authorName: schema.users.displayName,
        updatedAt: schema.wordLists.updatedAt,
        words: sql<number>`(select count(*)::int from words w where w.list_id = word_lists.id and w.archived_at is null)`,
        targets: sql<number>`(select count(*)::int from word_list_targets t where t.list_id = word_lists.id)`,
        groups: sql<{ id: string; name: string }[]>`coalesce((select json_agg(json_build_object('id', c.id, 'name', c.name) order by c.name) from word_list_targets t join classes c on c.id = t.class_id where t.list_id = word_lists.id and ${inScope}), '[]'::json)`,
        students: sql<number>`(select count(*)::int from word_list_targets t where t.list_id = word_lists.id and t.student_id is not null)`,
      })
      .from(schema.wordLists)
      .innerJoin(schema.users, eq(schema.users.id, schema.wordLists.createdBy))
      .where(where)
      .orderBy(desc(schema.wordLists.updatedAt))
      .limit(LISTS_PER_PAGE)
      .offset((page - 1) * LISTS_PER_PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(schema.wordLists).where(where),
  ]);
  return Object.assign(rows, { total, page });
}

const bulkInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  op: z.enum(["publish", "draft", "archive", "assign", "unassign"]),
  classIds: z.array(z.string().uuid()).max(100).default([]),
});

/** One action on many sets. Each set is checked on its own; failures are reported, not hidden. */
export async function bulkWordLists(actor: Actor, input: unknown) {
  requireStaff(actor);
  const v = bulkInput.parse(input);
  const classIds = [...new Set(v.classIds)];
  if ((v.op === "assign" || v.op === "unassign") && !classIds.length) throw invalid(tr("Guruhlarni tanlang."));
  if (classIds.length) await assertTargetsInScope(actor, classIds, [], db);
  const failed: { title: string; error: string }[] = [];
  let done = 0;
  for (const id of [...new Set(v.ids)]) {
    let title = id;
    try {
      if (v.op === "publish" || v.op === "draft" || v.op === "archive") {
        title = (await loadList(actor, id, true)).title;
        await setWordListStatus(actor, id, v.op === "publish" ? "published" : v.op === "draft" ? "draft" : "archived");
      } else {
        const l = await loadList(actor, id, false);
        title = l.title;
        if (v.op === "assign") {
          await db.insert(schema.wordListTargets).values(classIds.map((classId) => ({ listId: id, classId }))).onConflictDoNothing();
          if (l.status === "published") await notifyTargets(id, l.title);
        } else await db.delete(schema.wordListTargets).where(and(eq(schema.wordListTargets.listId, id), inArray(schema.wordListTargets.classId, classIds)));
        await audit(actor.id, v.op === "assign" ? "vocab.assign" : "vocab.unassign", "word_list", id, { classes: classIds.length, bulk: true });
      }
      done++;
    } catch (e) {
      failed.push({ title, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { done, failed };
}

/** Data checks for admins: same word with different translations across sets, sets nobody can see. */
export async function vocabQuality(actor: Actor) {
  requireStaff(actor);
  const [conflicts, unassigned, noExample] = await Promise.all([
    db.execute<{ english: string; translations: string[]; lists: { id: string; title: string }[] }>(sql`
      select lower(w.english) as english, array_agg(distinct w.uzbek) as translations,
        json_agg(distinct jsonb_build_object('id', l.id, 'title', l.title)) as lists
      from words w join word_lists l on l.id = w.list_id
      where w.archived_at is null and l.status <> 'archived'
      group by lower(w.english) having count(distinct lower(w.uzbek)) > 1
      order by count(*) desc, 1 limit 50`),
    db.execute<{ id: string; title: string; status: string }>(sql`
      select l.id, l.title, l.status from word_lists l
      where l.status = 'published' and not exists (select 1 from word_list_targets t where t.list_id = l.id)
      order by l.updated_at desc limit 50`),
    db.execute<{ n: number }>(sql`select count(*)::int as n from words w join word_lists l on l.id = w.list_id where w.archived_at is null and l.status <> 'archived' and w.example = ''`),
  ]);
  return { conflicts: [...conflicts], unassigned: [...unassigned], noExample: noExample[0]?.n ?? 0 };
}

export async function getWordList(actor: Actor, id: string) {
  const list = await loadList(actor, id, false);
  const [words, targets] = await Promise.all([
    db.select().from(schema.words).where(and(eq(schema.words.listId, id), isNull(schema.words.archivedAt))).orderBy(asc(schema.words.position), asc(schema.words.createdAt)),
    db.select().from(schema.wordListTargets).where(eq(schema.wordListTargets.listId, id)),
  ]);
  return { list, words, targets, canEdit: isAdmin(actor) || list.createdBy === actor.id };
}

export async function saveWordList(actor: Actor, id: string | null, input: unknown) {
  requireStaff(actor);
  const v = listInput.parse(input);
  if (id) {
    await loadList(actor, id, true);
    await db.update(schema.wordLists).set({ ...v, updatedAt: new Date(), updatedBy: actor.id }).where(eq(schema.wordLists.id, id));
    await audit(actor.id, "vocab.list_update", "word_list", id);
    return id;
  }
  const [l] = await db.insert(schema.wordLists).values({ ...v, createdBy: actor.id }).returning({ id: schema.wordLists.id });
  await audit(actor.id, "vocab.list_create", "word_list", l.id, { title: v.title });
  return l.id;
}

export async function setWordListStatus(actor: Actor, id: string, status: "draft" | "published" | "archived") {
  const l = await loadList(actor, id, true);
  if (status === "published") {
    const n = (await db.select({ n: sql<number>`count(*)::int` }).from(schema.words).where(and(eq(schema.words.listId, id), isNull(schema.words.archivedAt))))[0]?.n ?? 0;
    if (!n) throw invalid(tr("E’lon qilishdan oldin kamida bitta so‘z qo‘shing."));
  }
  await db.update(schema.wordLists).set({ status, updatedAt: new Date() }).where(eq(schema.wordLists.id, id));
  await audit(actor.id, `vocab.list_${status}`, "word_list", id);
  if (status === "published" && l.status !== "published") await notifyTargets(id, l.title);
}

async function assertWordFiles(actor: Actor, v: WordInput, current?: { audioFileId: string | null; imageFileId: string | null }) {
  const fresh = [v.audioFileId, v.imageFileId].filter((x): x is string => !!x && x !== current?.audioFileId && x !== current?.imageFileId);
  if (fresh.length) await assertOwnFiles(actor.id, fresh);
  for (const [fid, kind] of [
    [v.audioFileId, "audio/"],
    [v.imageFileId, "image/"],
  ] as const) {
    if (!fid) continue;
    const [f] = await db.select({ mime: schema.files.mime }).from(schema.files).where(eq(schema.files.id, fid));
    if (!f?.mime.startsWith(kind)) throw invalid(kind === "audio/" ? tr("Talaffuz uchun audio fayl tanlang.") : tr("Rasm faylini tanlang."));
  }
}

export async function saveWord(actor: Actor, listId: string, wordId: string | null, input: unknown) {
  await loadList(actor, listId, true);
  const v = wordInput.parse(input);
  try {
    if (wordId) {
      const [cur] = await db.select().from(schema.words).where(and(eq(schema.words.id, wordId), eq(schema.words.listId, listId)));
      if (!cur) throw notFound(tr("So‘z topilmadi."));
      await assertWordFiles(actor, v, cur);
      await db.update(schema.words).set({ ...v, updatedAt: new Date() }).where(eq(schema.words.id, wordId));
    } else {
      await assertWordFiles(actor, v);
      const pos = (await db.select({ n: sql<number>`coalesce(max(position), -1)::int + 1` }).from(schema.words).where(eq(schema.words.listId, listId)))[0]?.n ?? 0;
      await db.insert(schema.words).values({ ...v, listId, position: pos });
    }
  } catch (e) {
    if (isUniqueViolation(e)) throw invalid(tr("“{0}” bu ro‘yxatda allaqachon bor.", v.english));
    throw e;
  }
  await db.update(schema.wordLists).set({ updatedAt: new Date(), updatedBy: actor.id }).where(eq(schema.wordLists.id, listId));
}

/** Words with study history are archived (history stays), others are deleted. */
export async function removeWord(actor: Actor, listId: string, wordId: string) {
  await loadList(actor, listId, true);
  const used = (await db.select({ n: sql<number>`count(*)::int` }).from(schema.vocabProgress).where(eq(schema.vocabProgress.wordId, wordId)))[0]?.n ?? 0;
  if (used) await db.update(schema.words).set({ archivedAt: new Date() }).where(and(eq(schema.words.id, wordId), eq(schema.words.listId, listId)));
  else await db.delete(schema.words).where(and(eq(schema.words.id, wordId), eq(schema.words.listId, listId)));
  await audit(actor.id, "vocab.word_remove", "word_list", listId, { wordId, archived: used > 0 });
}

export async function importWords(actor: Actor, listId: string, text: string, swap = false): Promise<WordImportResult> {
  await loadList(actor, listId, true);
  await enforce(`vocab-import:${actor.id}`, 30, 3600);
  const existing = await db.select({ e: schema.words.english }).from(schema.words).where(and(eq(schema.words.listId, listId), isNull(schema.words.archivedAt)));
  if (text.length > 300_000) throw invalid(tr("Matn juda katta."));
  const { rows, duplicates, errors } = parseWordList(text, existing.map((x) => x.e), swap);
  if (errors.length) return { added: 0, duplicates, errors };
  if (rows.length) {
    await db.transaction(async (tx) => {
      const start = (await tx.select({ n: sql<number>`coalesce(max(position), -1)::int + 1` }).from(schema.words).where(eq(schema.words.listId, listId)))[0]?.n ?? 0;
      await tx.insert(schema.words).values(rows.map((r, i) => ({ ...r, listId, position: start + i })));
      await tx.update(schema.wordLists).set({ updatedAt: new Date() }).where(eq(schema.wordLists.id, listId));
      await audit(actor.id, "vocab.import", "word_list", listId, { added: rows.length, duplicates: duplicates.length }, tx);
    });
  }
  return { added: rows.length, duplicates, errors };
}

export async function setWordListTargets(actor: Actor, listId: string, input: { classIds: string[]; studentIds: string[] }) {
  const l = await loadList(actor, listId, false);
  const parsed = z.object({ classIds: z.array(z.string().uuid()).max(100), studentIds: z.array(z.string().uuid()).max(500) }).parse(input);
  const v = { classIds: [...new Set(parsed.classIds)], studentIds: [...new Set(parsed.studentIds)] };
  const before = await db.select().from(schema.wordListTargets).where(eq(schema.wordListTargets.listId, listId));
  await db.transaction(async (tx) => {
    await assertTargetsInScope(actor, v.classIds, v.studentIds, tx);
    // Teachers only replace targets inside their own scope; other teachers' assignments of this list stay.
    const scope = await manageableClassIds(actor, tx);
    const mine = (t: (typeof before)[number]) => scope === "all" || (t.classId ? scope.includes(t.classId) : true);
    const removable = before.filter(mine).map((t) => t.id);
    if (removable.length) await tx.delete(schema.wordListTargets).where(inArray(schema.wordListTargets.id, removable));
    const rows = [...v.classIds.map((classId) => ({ listId, classId })), ...v.studentIds.map((studentId) => ({ listId, studentId }))];
    if (rows.length) await tx.insert(schema.wordListTargets).values(rows);
    await audit(actor.id, "vocab.assign", "word_list", listId, { classes: v.classIds.length, students: v.studentIds.length }, tx);
  });
  if (l.status === "published") await notifyTargets(listId, l.title);
}

async function studentsOfList(listId: string) {
  const rows = await db.execute<{ id: string }>(sql`
    select t.student_id as id from word_list_targets t where t.list_id = ${listId} and t.student_id is not null
    union
    select cs.student_id from word_list_targets t join class_students cs on cs.class_id = t.class_id where t.list_id = ${listId}`);
  return rows.map((r) => r.id);
}

export async function notifyTargets(listId: string, title: string) {
  await notify(await studentsOfList(listId), { type: "vocabulary", title: `Yangi lug‘at: ${title}`, link: `/vocabulary/lists/${listId}`, dedupeKey: `vocab:${listId}` });
}

/** Per-student review activity for a list (staff view). */
export async function listActivity(actor: Actor, listId: string) {
  await loadList(actor, listId, false);
  const scope = await manageableClassIds(actor);
  const rows = await db.execute<{ id: string; name: string; started: number; learned: number; mastered: number; due: number; reviews: number; correct: number; last: string | null }>(sql`
    with targets as (
      select t.student_id as sid from word_list_targets t where t.list_id = ${listId} and t.student_id is not null
      union select cs.student_id from word_list_targets t join class_students cs on cs.class_id = t.class_id where t.list_id = ${listId}
    ), lw as (select id from words where list_id = ${listId} and archived_at is null)
    select u.id, u.display_name as name,
      (select count(*)::int from vocab_progress p where p.student_id = u.id and p.word_id in (select id from lw)) as started,
      (select count(*)::int from vocab_progress p where p.student_id = u.id and p.word_id in (select id from lw) and p.reps > 0) as learned,
      (select count(*)::int from vocab_progress p where p.student_id = u.id and p.word_id in (select id from lw) and p.state = 'mastered') as mastered,
      (select count(*)::int from vocab_progress p where p.student_id = u.id and p.word_id in (select id from lw) and p.due_at <= now()) as due,
      (select count(*)::int from vocab_reviews r where r.student_id = u.id and r.word_id in (select id from lw)) as reviews,
      (select count(*)::int from vocab_reviews r where r.student_id = u.id and r.word_id in (select id from lw) and r.correct) as correct,
      (select max(r.reviewed_at) from vocab_reviews r where r.student_id = u.id and r.word_id in (select id from lw)) as last
    from users u
    where u.id in (select sid from targets) and u.role = 'student'
      ${scope === "all" ? sql`` : scope.length ? sql`and u.id in (select student_id from class_students where class_id in ${scope})` : sql`and false`}
    order by u.display_name`);
  return rows.map((r) => ({ ...r, last: r.last ? new Date(r.last) : null, accuracy: r.reviews ? Math.round((100 * r.correct) / r.reviews) : null }));
}

// ─── Student: what they may study ────────────────────────────────────────────

const requireStudentActor = (a: Actor) => {
  if (!isStudent(a)) throw forbidden();
};

/**
 * Published lists assigned to the student directly or through a group they belong to right now.
 * Checked on every request, so leaving a group (or the group being archived) revokes access at once;
 * the student's progress rows stay and come back if the access does.
 */
export async function studentListIds(studentId: string, ex: Executor = db, classId?: string | null) {
  const rows = await ex.execute<{ id: string }>(sql`
    select distinct l.id from word_lists l join word_list_targets t on t.list_id = l.id
    where l.status = 'published' and (
      ${classId ? sql`false` : sql`t.student_id = ${studentId}`}
      or t.class_id in (
        select cs.class_id from class_students cs join classes c on c.id = cs.class_id
        where cs.student_id = ${studentId} and c.archived_at is null ${classId ? sql`and c.id = ${classId}` : sql``}
      )
    )`);
  return rows.map((r) => r.id);
}

async function assertWordVisible(studentId: string, wordId: string) {
  const ids = await studentListIds(studentId);
  const [w] = ids.length ? await db.select().from(schema.words).where(and(eq(schema.words.id, wordId), inArray(schema.words.listId, ids))) : [];
  if (!w) throw notFound(tr("So‘z topilmadi."));
  return w;
}

/** The student's vocabulary overview; with `classId`, only the sets of that group (membership checked in SQL). */
export async function vocabOverview(actor: Actor, classId?: string | null) {
  requireStudentActor(actor);
  const listIds = await studentListIds(actor.id, db, classId);
  const [me] = await db.select({ newPerDay: schema.users.newWordsPerDay }).from(schema.users).where(eq(schema.users.id, actor.id));
  if (!listIds.length) return { lists: [], totals: { words: 0, learned: 0, mastered: 0, due: 0, difficult: 0, favorites: 0, newAvailable: 0, reviewedToday: 0, newToday: 0, recent: 0 }, newPerDay: me?.newPerDay ?? 10 };
  const [lists, t] = await Promise.all([
    db.execute<{ id: string; title: string; level: string; topic: string; words: number; learned: number; mastered: number; due: number }>(sql`
      select l.id, l.title, l.level, l.topic,
        (select count(*)::int from words w where w.list_id = l.id and w.archived_at is null) as words,
        (select count(*)::int from vocab_progress p join words w on w.id = p.word_id where w.list_id = l.id and w.archived_at is null and p.student_id = ${actor.id} and p.reps > 0) as learned,
        (select count(*)::int from vocab_progress p join words w on w.id = p.word_id where w.list_id = l.id and w.archived_at is null and p.student_id = ${actor.id} and p.state = 'mastered') as mastered,
        (select count(*)::int from vocab_progress p join words w on w.id = p.word_id where w.list_id = l.id and w.archived_at is null and p.student_id = ${actor.id} and p.due_at <= now()) as due
      from word_lists l where l.id in ${listIds} order by l.updated_at desc`),
    db.execute<Record<string, number>>(sql`
      with w as (select id from words where list_id in ${listIds} and archived_at is null),
      p as (select * from vocab_progress where student_id = ${actor.id} and word_id in (select id from w))
      select
        (select count(*)::int from w) as words,
        (select count(*)::int from p where reps > 0) as learned,
        (select count(*)::int from p where state = 'mastered') as mastered,
        (select count(*)::int from p where due_at <= now()) as due,
        (select count(*)::int from p where difficult) as difficult,
        (select count(*)::int from p where favorite) as favorites,
        (select count(*)::int from w where id not in (select word_id from p)) as "newAvailable",
        (select count(*)::int from p where created_at >= now() - interval '7 days' and reps > 0) as recent,
        (select count(*)::int from vocab_reviews r where r.student_id = ${actor.id} and (r.reviewed_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date) as "reviewedToday",
        (select count(*)::int from p where (created_at at time zone ${TZ})::date = (now() at time zone ${TZ})::date) as "newToday"`),
  ]);
  const totals = t[0] as { words: number; learned: number; mastered: number; due: number; difficult: number; favorites: number; newAvailable: number; reviewedToday: number; newToday: number; recent: number };
  return { lists: [...lists], totals, newPerDay: me?.newPerDay ?? 10 };
}

export async function studentWordList(actor: Actor, listId: string) {
  requireStudentActor(actor);
  if (!(await studentListIds(actor.id)).includes(listId)) throw notFound(tr("Ro‘yxat topilmadi."));
  const [list] = await db.select().from(schema.wordLists).where(eq(schema.wordLists.id, listId));
  const words = await db
    .select({ w: schema.words, p: schema.vocabProgress })
    .from(schema.words)
    .leftJoin(schema.vocabProgress, and(eq(schema.vocabProgress.wordId, schema.words.id), eq(schema.vocabProgress.studentId, actor.id)))
    .where(and(eq(schema.words.listId, listId), isNull(schema.words.archivedAt)))
    .orderBy(asc(schema.words.position));
  return { list, words: words.map(({ w, p }) => ({ ...w, progress: p })) };
}

export type SessionMode = "daily" | "learn" | "review" | "difficult" | "favorites";
export type PracticeKind = "flashcard" | "typing" | "choice" | "match" | "listen";

export type SessionCard = {
  id: string;
  english: string;
  uzbek: string;
  example: string;
  exampleUz: string;
  phonetic: string;
  partOfSpeech: string;
  audioFileId: string | null;
  imageFileId: string | null;
  isNew: boolean;
  favorite: boolean;
  difficult: boolean;
  /** For "choice": three other translations from the student's lists. */
  distractors: string[];
};

/**
 * Builds a study session: due reviews first, then new words up to the daily limit.
 * Card content is safe to send — the student is studying these words, there is nothing to hide.
 */
export async function sessionCards(actor: Actor, opts: { mode: SessionMode; listId?: string | null; limit?: number }): Promise<SessionCard[]> {
  requireStudentActor(actor);
  const all = await studentListIds(actor.id);
  const listIds = opts.listId ? all.filter((x) => x === opts.listId) : all;
  if (!listIds.length) return [];
  const limit = Math.min(Math.max(opts.limit ?? 20, 4), 50);
  const ov = await vocabOverview(actor);
  const newRoom = opts.mode === "learn" ? limit : Math.max(0, ov.newPerDay - ov.totals.newToday);

  const base = db
    .select({ w: schema.words, p: schema.vocabProgress })
    .from(schema.words)
    .leftJoin(schema.vocabProgress, and(eq(schema.vocabProgress.wordId, schema.words.id), eq(schema.vocabProgress.studentId, actor.id)));
  const live = and(inArray(schema.words.listId, listIds), isNull(schema.words.archivedAt));
  let picked: { w: typeof schema.words.$inferSelect; p: typeof schema.vocabProgress.$inferSelect | null }[] = [];
  if (opts.mode === "difficult") picked = await base.where(and(live, sql`(${schema.vocabProgress.difficult} or ${schema.vocabProgress.lapses} > 0 or (${schema.vocabProgress.reps} = 0 and ${schema.vocabProgress.lastReviewedAt} is not null))`)).orderBy(asc(schema.vocabProgress.dueAt)).limit(limit);
  else if (opts.mode === "favorites") picked = await base.where(and(live, eq(schema.vocabProgress.favorite, true))).orderBy(asc(schema.vocabProgress.dueAt)).limit(limit);
  else {
    const due = opts.mode === "learn" ? [] : await base.where(and(live, sql`${schema.vocabProgress.dueAt} <= now()`)).orderBy(asc(schema.vocabProgress.dueAt)).limit(limit);
    const fresh =
      opts.mode === "review" || newRoom === 0
        ? []
        : await base
            .where(and(live, isNull(schema.vocabProgress.wordId)))
            .orderBy(asc(schema.words.listId), asc(schema.words.position))
            .limit(Math.min(newRoom, limit - due.length));
    picked = [...due, ...fresh];
  }
  if (!picked.length) return [];
  const pool = await db
    .select({ id: schema.words.id, uzbek: schema.words.uzbek })
    .from(schema.words)
    .where(and(inArray(schema.words.listId, all), isNull(schema.words.archivedAt)))
    .orderBy(sql`random()`)
    .limit(60);
  return picked.map(({ w, p }) => ({
    id: w.id,
    english: w.english,
    uzbek: w.uzbek,
    example: w.example,
    exampleUz: w.exampleUz,
    phonetic: w.phonetic,
    partOfSpeech: w.partOfSpeech,
    audioFileId: w.audioFileId,
    imageFileId: w.imageFileId,
    isNew: !p,
    favorite: !!p?.favorite,
    difficult: !!p?.difficult,
    distractors: [...new Set(pool.filter((x) => x.id !== w.id && x.uzbek.toLowerCase() !== w.uzbek.toLowerCase()).map((x) => x.uzbek))].slice(0, 3),
  }));
}

const reviewInput = z.object({
  wordId: z.string().uuid(),
  kind: z.enum(["flashcard", "typing", "choice", "match", "listen"]),
  /** flashcard: self-assessed grade. */
  grade: z.number().int().min(0).max(3).optional(),
  /** typing/listen: the typed English; choice: the picked translation; match: whether the pair was matched first time. */
  response: z.string().max(200).optional(),
  matched: z.boolean().optional(),
});

/** Records one review, decides correctness on the server, and reschedules the word. */
export async function recordReview(actor: Actor, input: unknown) {
  requireStudentActor(actor);
  const v = reviewInput.parse(input);
  await enforce(`vocab-review:${actor.id}`, 600, 3600);
  const w = await assertWordVisible(actor.id, v.wordId);
  let correct: boolean;
  let grade: SrsGrade;
  if (v.kind === "flashcard") {
    if (v.grade == null) throw invalid(tr("Bahoni tanlang."));
    grade = v.grade as SrsGrade;
    correct = grade > 0;
  } else {
    if (v.kind === "match") correct = !!v.matched;
    else if (v.kind === "choice") correct = !!v.response && v.response.trim().toLowerCase() === w.uzbek.trim().toLowerCase();
    else correct = matchesAnswer(v.response ?? "", w.english);
    grade = gradeFor(correct);
  }
  const result = await db.transaction(async (tx) => {
    const [prev] = await tx
      .select()
      .from(schema.vocabProgress)
      .where(and(eq(schema.vocabProgress.studentId, actor.id), eq(schema.vocabProgress.wordId, w.id)))
      .for("update");
    const next = schedule(prev ? { ease: Number(prev.ease), intervalDays: Number(prev.intervalDays), reps: prev.reps, lapses: prev.lapses, state: prev.state as "learning" } : null, grade);
    const values = { ease: next.ease, intervalDays: next.intervalDays, reps: next.reps, lapses: next.lapses, state: next.state, dueAt: next.dueAt, lastReviewedAt: new Date() };
    if (prev) await tx.update(schema.vocabProgress).set(values).where(and(eq(schema.vocabProgress.studentId, actor.id), eq(schema.vocabProgress.wordId, w.id)));
    else await tx.insert(schema.vocabProgress).values({ studentId: actor.id, wordId: w.id, ...values });
    await tx.insert(schema.vocabReviews).values({ studentId: actor.id, wordId: w.id, mode: v.kind, grade, correct, response: v.response ?? null, intervalDays: next.intervalDays });
    return next;
  });
  return { correct, english: w.english, uzbek: w.uzbek, state: result.state, dueAt: result.dueAt, intervalDays: result.intervalDays };
}

export async function setWordFlag(actor: Actor, wordId: string, flag: "favorite" | "difficult", on: boolean) {
  requireStudentActor(actor);
  const w = await assertWordVisible(actor.id, wordId);
  const set = flag === "favorite" ? { favorite: on } : { difficult: on };
  // Flagging a word the student hasn't studied yet creates a progress row that is due now.
  await db
    .insert(schema.vocabProgress)
    .values({ studentId: actor.id, wordId: w.id, ...set })
    .onConflictDoUpdate({ target: [schema.vocabProgress.studentId, schema.vocabProgress.wordId], set });
}

/** Words of the student's lists that appear in a reading text (for vocabulary assistance). */
export async function glossaryFor(studentId: string, text: string) {
  if (!text.trim()) return [];
  const listIds = await studentListIds(studentId);
  if (!listIds.length) return [];
  const tokens = new Set(text.toLowerCase().match(/[a-z][a-z'-]*/g) ?? []);
  if (!tokens.size) return [];
  const words = await db
    .select({ english: schema.words.english, uzbek: schema.words.uzbek, phonetic: schema.words.phonetic })
    .from(schema.words)
    .where(and(inArray(schema.words.listId, listIds), isNull(schema.words.archivedAt)));
  const lower = text.toLowerCase();
  const seen = new Set<string>();
  return words
    .filter((w) => {
      const e = w.english.toLowerCase();
      if (seen.has(e)) return false;
      const hit = e.includes(" ") ? lower.includes(e) : tokens.has(e);
      if (hit) seen.add(e);
      return hit;
    })
    .slice(0, 40);
}

export async function setVocabGoal(actor: Actor, newWordsPerDay: number) {
  requireStudentActor(actor);
  const n = z.coerce.number().int().min(0).max(50).parse(newWordsPerDay);
  await db.update(schema.users).set({ newWordsPerDay: n, updatedAt: new Date() }).where(eq(schema.users.id, actor.id));
}

// ─── Game ────────────────────────────────────────────────────────────────────

export type GameCard = { id: string; prompt: string; answer: string; options: string[]; direction: "en_uz" | "uz_en"; audioFileId: string | null; english: string };

/** A round of random words from the student's lists, each with three wrong options. */
export async function gameCards(actor: Actor, listId?: string | null): Promise<GameCard[]> {
  requireStudentActor(actor);
  const all = await studentListIds(actor.id);
  const ids = listId ? all.filter((x) => x === listId) : all;
  if (!ids.length) return [];
  const pool = await db
    .select({ id: schema.words.id, english: schema.words.english, uzbek: schema.words.uzbek, audioFileId: schema.words.audioFileId })
    .from(schema.words)
    .where(and(inArray(schema.words.listId, ids), isNull(schema.words.archivedAt)))
    .orderBy(sql`random()`)
    .limit(200);
  if (pool.length < 2) return [];
  const pick = (exclude: string, key: "english" | "uzbek") =>
    [...new Set(pool.filter((p) => p.id !== exclude && p[key].toLowerCase() !== pool.find((x) => x.id === exclude)![key].toLowerCase()).map((p) => p[key]))]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  return pool.slice(0, GAME_ROUND).map((w, i) => {
    const dir = i % 2 ? "uz_en" : "en_uz";
    const answer = dir === "en_uz" ? w.uzbek : w.english;
    const options = [answer, ...pick(w.id, dir === "en_uz" ? "uzbek" : "english")].sort(() => Math.random() - 0.5);
    return { id: w.id, prompt: dir === "en_uz" ? w.english : w.uzbek, answer, options, direction: dir, audioFileId: w.audioFileId, english: w.english };
  });
}

const gameInput = z.object({
  listId: z.string().uuid().nullable().default(null),
  answers: z.array(z.object({ wordId: z.string().uuid(), correct: z.boolean(), ms: z.number().int().min(0).max(600_000) })).min(1).max(50),
});

/**
 * Stores a finished round. The score is recomputed here. Each answer is also a review: a miss always
 * reschedules the word (it needs practice); a hit only moves the schedule when the word was due or new,
 * so playing for fun never skips spaced repetition.
 */
export async function finishGame(actor: Actor, input: unknown) {
  requireStudentActor(actor);
  const v = gameInput.parse(input);
  await enforce(`vocab-game:${actor.id}`, 120, 3600);
  const visible = await studentListIds(actor.id);
  const wordIds = [...new Set(v.answers.map((a) => a.wordId))];
  const words = visible.length ? await db.select({ id: schema.words.id }).from(schema.words).where(and(inArray(schema.words.id, wordIds), inArray(schema.words.listId, visible))) : [];
  if (words.length !== wordIds.length) throw notFound(tr("So‘z topilmadi."));
  const { score, bestStreak, correct } = gameScore(v.answers);
  const prevBest = await db
    .select({ s: sql<number>`coalesce(max(${schema.vocabGames.score}), 0)::int` })
    .from(schema.vocabGames)
    .where(and(eq(schema.vocabGames.studentId, actor.id), v.listId ? eq(schema.vocabGames.listId, v.listId) : sql`true`));
  await db.transaction(async (tx) => {
    await tx.insert(schema.vocabGames).values({ studentId: actor.id, listId: v.listId, score, correct, total: v.answers.length, bestStreak });
    const now = new Date();
    for (const a of v.answers) {
      const [prev] = await tx
        .select()
        .from(schema.vocabProgress)
        .where(and(eq(schema.vocabProgress.studentId, actor.id), eq(schema.vocabProgress.wordId, a.wordId)))
        .for("update");
      const due = !prev || prev.dueAt <= now;
      const grade: SrsGrade = a.correct ? 2 : 0;
      if (!a.correct || due) {
        const next = schedule(prev ? { ease: Number(prev.ease), intervalDays: Number(prev.intervalDays), reps: prev.reps, lapses: prev.lapses, state: prev.state as "learning" } : null, grade, now);
        const values = { ease: next.ease, intervalDays: next.intervalDays, reps: next.reps, lapses: next.lapses, state: next.state, dueAt: next.dueAt, lastReviewedAt: now };
        if (prev) await tx.update(schema.vocabProgress).set(values).where(and(eq(schema.vocabProgress.studentId, actor.id), eq(schema.vocabProgress.wordId, a.wordId)));
        else await tx.insert(schema.vocabProgress).values({ studentId: actor.id, wordId: a.wordId, ...values });
        await tx.insert(schema.vocabReviews).values({ studentId: actor.id, wordId: a.wordId, mode: "game", grade, correct: a.correct, intervalDays: next.intervalDays });
      } else {
        await tx.insert(schema.vocabReviews).values({ studentId: actor.id, wordId: a.wordId, mode: "game", grade, correct: true, intervalDays: Number(prev.intervalDays) });
      }
    }
  });
  return { score, correct, total: v.answers.length, bestStreak, best: Math.max(score, prevBest[0]?.s ?? 0), newBest: score > (prevBest[0]?.s ?? 0) };
}

export async function gameBest(actor: Actor, listId?: string | null) {
  requireStudentActor(actor);
  const [r] = await db
    .select({ best: sql<number>`coalesce(max(${schema.vocabGames.score}), 0)::int`, games: sql<number>`count(*)::int` })
    .from(schema.vocabGames)
    .where(and(eq(schema.vocabGames.studentId, actor.id), listId ? eq(schema.vocabGames.listId, listId) : sql`true`));
  return r ?? { best: 0, games: 0 };
}

/** Sets assigned to one group with how far its current students got (group detail page). */
export async function classVocabulary(actor: Actor, classId: string) {
  requireStaff(actor);
  const scope = await manageableClassIds(actor);
  if (scope !== "all" && !scope.includes(classId)) throw forbidden();
  const rows = await db.execute<{ id: string; title: string; status: string; level: string; words: number; students: number; started: number; learned: number }>(sql`
    with members as (select cs.student_id from class_students cs join users u on u.id = cs.student_id where cs.class_id = ${classId} and u.status = 'active')
    select l.id, l.title, l.status, l.level,
      (select count(*)::int from words w where w.list_id = l.id and w.archived_at is null) as words,
      (select count(*)::int from members) as students,
      (select count(distinct p.student_id)::int from vocab_progress p join words w on w.id = p.word_id where w.list_id = l.id and w.archived_at is null and p.student_id in (select student_id from members)) as started,
      (select count(*)::int from vocab_progress p join words w on w.id = p.word_id where w.list_id = l.id and w.archived_at is null and p.reps > 0 and p.student_id in (select student_id from members)) as learned
    from word_lists l join word_list_targets t on t.list_id = l.id and t.class_id = ${classId}
    where l.status <> 'archived' order by l.title`);
  return rows.map((r) => ({ ...r, progress: r.words && r.students ? Math.round((100 * r.learned) / (r.words * r.students)) : 0 }));
}

/** Vocabulary numbers for the admin dashboard. */
export async function vocabStats() {
  const [c] = await db.execute<{ lists: number; published: number; drafts: number; archived: number; words: number; unassigned: number; imports30: number; failed30: number; wordsWeek: number }>(sql`
    select
      (select count(*)::int from word_lists) as lists,
      (select count(*)::int from word_lists where status = 'published') as published,
      (select count(*)::int from word_lists where status = 'draft') as drafts,
      (select count(*)::int from word_lists where status = 'archived') as archived,
      (select count(*)::int from words w join word_lists l on l.id = w.list_id where w.archived_at is null and l.status <> 'archived') as words,
      (select count(*)::int from word_lists l where l.status = 'published' and not exists (select 1 from word_list_targets t where t.list_id = l.id)) as unassigned,
      (select count(*)::int from import_jobs where created_at > now() - interval '30 days') as imports30,
      (select count(*)::int from import_jobs where created_at > now() - interval '30 days' and (status = 'failed' or failed > 0)) as failed30,
      (select count(*)::int from words where created_at > now() - interval '7 days' and archived_at is null) as "wordsWeek"`);
  const recent = await db
    .select({ id: schema.wordLists.id, title: schema.wordLists.title, status: schema.wordLists.status, updatedAt: schema.wordLists.updatedAt, words: sql<number>`(select count(*)::int from words w where w.list_id = word_lists.id and w.archived_at is null)` })
    .from(schema.wordLists)
    .where(sql`${schema.wordLists.status} <> 'archived'`)
    .orderBy(desc(schema.wordLists.updatedAt))
    .limit(5);
  return { ...c, recent };
}

/** Active groups of a student that have at least one published set (for the group switch). */
export async function studentVocabGroups(studentId: string) {
  return db.execute<{ id: string; name: string }>(sql`
    select c.id, c.name from class_students cs join classes c on c.id = cs.class_id
    where cs.student_id = ${studentId} and c.archived_at is null
      and exists (select 1 from word_list_targets t join word_lists l on l.id = t.list_id where t.class_id = c.id and l.status = 'published')
    order by c.name`);
}
