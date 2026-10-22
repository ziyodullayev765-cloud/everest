import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema, type Executor } from "../db";
import { isAdmin, isStudent, type Actor } from "../auth/rbac";
import { forbidden, invalid, isUniqueViolation, notFound } from "../errors";
import { audit } from "./audit";
import { manageableClassIds, studentClassIds } from "./access";
import { assertTargetsInScope } from "./assignments";
import { assertOwnFiles } from "./files";
import { notify } from "./notifications";
import { enforce } from "./rate-limit";
import { gradeFor, matchesAnswer, schedule, type SrsGrade } from "@/lib/srs";
import { parseWordList, wordInput, type WordImportResult, type WordInput } from "@/lib/word-csv";
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
async function loadList(actor: Actor, id: string, forEdit: boolean, ex: Executor = db) {
  requireStaff(actor);
  const [l] = await ex.select().from(schema.wordLists).where(eq(schema.wordLists.id, id));
  if (!l) throw notFound("Ro‘yxat topilmadi.");
  if (forEdit && !isAdmin(actor) && l.createdBy !== actor.id) throw forbidden("Bu ro‘yxatni faqat muallif yoki administrator tahrirlaydi.");
  if (!forEdit && !isAdmin(actor) && l.createdBy !== actor.id && l.status !== "published") throw notFound("Ro‘yxat topilmadi.");
  return l;
}

export async function listWordLists(actor: Actor, f: { q?: string; status?: string } = {}) {
  requireStaff(actor);
  const conds = [
    isAdmin(actor) ? sql`true` : sql`(${schema.wordLists.createdBy} = ${actor.id} or ${schema.wordLists.status} = 'published')`,
    f.status ? eq(schema.wordLists.status, f.status) : sql`${schema.wordLists.status} <> 'archived'`,
    f.q ? sql`${schema.wordLists.title} ilike ${"%" + f.q + "%"}` : sql`true`,
  ];
  return db
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
    })
    .from(schema.wordLists)
    .innerJoin(schema.users, eq(schema.users.id, schema.wordLists.createdBy))
    .where(and(...conds))
    .orderBy(desc(schema.wordLists.updatedAt));
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
    await db.update(schema.wordLists).set({ ...v, updatedAt: new Date() }).where(eq(schema.wordLists.id, id));
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
    if (!n) throw invalid("E’lon qilishdan oldin kamida bitta so‘z qo‘shing.");
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
    if (!f?.mime.startsWith(kind)) throw invalid(kind === "audio/" ? "Talaffuz uchun audio fayl tanlang." : "Rasm faylini tanlang.");
  }
}

export async function saveWord(actor: Actor, listId: string, wordId: string | null, input: unknown) {
  await loadList(actor, listId, true);
  const v = wordInput.parse(input);
  try {
    if (wordId) {
      const [cur] = await db.select().from(schema.words).where(and(eq(schema.words.id, wordId), eq(schema.words.listId, listId)));
      if (!cur) throw notFound("So‘z topilmadi.");
      await assertWordFiles(actor, v, cur);
      await db.update(schema.words).set(v).where(eq(schema.words.id, wordId));
    } else {
      await assertWordFiles(actor, v);
      const pos = (await db.select({ n: sql<number>`coalesce(max(position), -1)::int + 1` }).from(schema.words).where(eq(schema.words.listId, listId)))[0]?.n ?? 0;
      await db.insert(schema.words).values({ ...v, listId, position: pos });
    }
  } catch (e) {
    if (isUniqueViolation(e)) throw invalid(`“${v.english}” bu ro‘yxatda allaqachon bor.`);
    throw e;
  }
  await db.update(schema.wordLists).set({ updatedAt: new Date() }).where(eq(schema.wordLists.id, listId));
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
  if (text.length > 300_000) throw invalid("Matn juda katta.");
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
  const v = z.object({ classIds: z.array(z.string().uuid()).max(100), studentIds: z.array(z.string().uuid()).max(500) }).parse(input);
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

async function notifyTargets(listId: string, title: string) {
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

/** Published lists assigned to the student directly or through a group. */
export async function studentListIds(studentId: string, ex: Executor = db) {
  const classIds = await studentClassIds(studentId, ex);
  const rows = await ex.execute<{ id: string }>(sql`
    select distinct l.id from word_lists l join word_list_targets t on t.list_id = l.id
    where l.status = 'published' and (t.student_id = ${studentId} ${classIds.length ? sql`or t.class_id in ${classIds}` : sql``})`);
  return rows.map((r) => r.id);
}

async function assertWordVisible(studentId: string, wordId: string) {
  const ids = await studentListIds(studentId);
  const [w] = ids.length ? await db.select().from(schema.words).where(and(eq(schema.words.id, wordId), inArray(schema.words.listId, ids))) : [];
  if (!w) throw notFound("So‘z topilmadi.");
  return w;
}

export async function vocabOverview(actor: Actor) {
  requireStudentActor(actor);
  const listIds = await studentListIds(actor.id);
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
  if (!(await studentListIds(actor.id)).includes(listId)) throw notFound("Ro‘yxat topilmadi.");
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
    if (v.grade == null) throw invalid("Bahoni tanlang.");
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
