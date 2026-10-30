import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { isAdmin, type Actor } from "../auth/rbac";
import { forbidden } from "../errors";

/** Plan limits (Neon Free: 1 GB per project; Vercel Blob Hobby: 1 GB). Override with env when the plan changes. */
const MB = 1024 * 1024;
export const DB_LIMIT_BYTES = Number(process.env.DB_STORAGE_LIMIT_MB || 1024) * MB;
export const BLOB_LIMIT_BYTES = Number(process.env.BLOB_STORAGE_LIMIT_MB || 1024) * MB;

/** Readable names for the tables admins care about; others are grouped as "other". */
const TABLE_LABELS: Record<string, string> = {
  files: "Fayllar (bazada saqlanadigan)",
  vocab_reviews: "So‘z takrorlash tarixi",
  vocab_progress: "So‘z o‘rganish holati",
  words: "So‘zlar",
  word_lists: "Lug‘at ro‘yxatlari",
  audit_logs: "Faoliyat jurnali",
  quiz_responses: "Quiz javoblari",
  quiz_attempts: "Quiz urinishlari",
  submissions: "Topshirilgan ishlar",
  submission_versions: "Ish versiyalari",
  submission_files: "Ishlarga biriktirilgan fayllar",
  assignments: "Vazifalar",
  questions: "Savollar",
  notifications: "Bildirishnomalar",
  xp_transactions: "XP yozuvlari",
  users: "Foydalanuvchilar",
  sessions: "Kirish sessiyalari",
  grades: "Baholar",
  lesson_marks: "Dars baholari",
  import_jobs: "Import tarixi",
  rate_limits: "Himoya hisoblagichlari",
  word_list_targets: "Lug‘at biriktirishlari",
  assignment_targets: "Vazifa biriktirishlari",
  class_teachers: "Guruh o‘qituvchilari",
  class_students: "Guruh a’zolari",
  assignment_attachments: "Vazifa ilovalari",
  question_options: "Savol variantlari",
  feedback: "Izohlar",
  grade_history: "Baholar tarixi",
  achievements: "Yutuqlar",
  user_achievements: "Olingan yutuqlar",
  weekly_medals: "Haftalik medallar",
  classes: "Guruhlar",
  books: "Kitoblar",
  book_audio: "Kitob audiolari",
  announcements: "E’lonlar",
  vocab_games: "So‘z o‘yinlari",
  settings: "Sozlamalar",
};

export type SystemStatus = Awaited<ReturnType<typeof systemStatus>>;

/** Live database health, space used vs the plan limit, the biggest tables, file storage and recent activity. */
export async function systemStatus(actor: Actor) {
  if (!isAdmin(actor)) throw forbidden();
  await db.execute(sql`select 1`);
  const t = performance.now();
  await db.execute(sql`select 1`);
  const pingMs = Math.round(performance.now() - t);

  const [[size], tables, [files], [conn], [activity], [version]] = await Promise.all([
    db.execute<{ bytes: number }>(sql`select pg_database_size(current_database())::float8 as bytes`),
    db.execute<{ name: string; bytes: number; rows: number }>(sql`
      select c.relname as name, pg_total_relation_size(c.oid)::float8 as bytes, greatest(c.reltuples, 0)::float8 as rows
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by pg_total_relation_size(c.oid) desc`),
    db.execute<{ db_count: number; db_bytes: number; blob_count: number; blob_bytes: number; week_bytes: number }>(sql`
      select
        count(*) filter (where storage = 'db')::int as db_count,
        coalesce(sum(size) filter (where storage = 'db'), 0)::float8 as db_bytes,
        count(*) filter (where storage = 'blob')::int as blob_count,
        coalesce(sum(size) filter (where storage = 'blob'), 0)::float8 as blob_bytes,
        coalesce(sum(size) filter (where created_at > now() - interval '7 days'), 0)::float8 as week_bytes
      from files`),
    db.execute<{ total: number; active: number; max: number }>(sql`
      select count(*)::int as total, count(*) filter (where state = 'active')::int as active,
        current_setting('max_connections')::int as max
      from pg_stat_activity where datname = current_database()`),
    db.execute<{ online: number; logins: number; reviews: number; submissions: number; attempts: number; actions: number; imports: number }>(sql`
      select
        (select count(distinct user_id)::int from sessions where last_seen_at > now() - interval '1 hour' and expires_at > now()) as online,
        (select count(*)::int from audit_logs where action = 'auth.login' and created_at > now() - interval '24 hours') as logins,
        (select count(*)::int from vocab_reviews where reviewed_at > now() - interval '24 hours') as reviews,
        (select count(*)::int from submission_versions where submitted_at > now() - interval '24 hours') as submissions,
        (select count(*)::int from quiz_attempts where started_at > now() - interval '24 hours') as attempts,
        (select count(*)::int from audit_logs where created_at > now() - interval '24 hours') as actions,
        (select count(*)::int from import_jobs where created_at > now() - interval '24 hours') as imports`),
    db.execute<{ v: string }>(sql`select current_setting('server_version') as v`),
  ]);

  const used = size.bytes;
  // Exact counts for the shown tables (Postgres' estimate is 0 until the table has been analysed); big tables keep the estimate.
  const top = await Promise.all(
    tables.slice(0, 10).map(async (r) => {
      const rows = r.rows >= 200_000 ? r.rows : Number((await db.execute<{ n: number }>(sql`select count(*)::float8 as n from ${sql.identifier(r.name)}`))[0]?.n ?? 0);
      return { name: r.name, label: TABLE_LABELS[r.name] ?? r.name, bytes: r.bytes, rows: Math.round(rows) };
    }),
  );
  const rest = tables.slice(10).reduce((s, r) => s + r.bytes, 0);
  return {
    ok: true,
    pingMs,
    region: process.env.VERCEL_REGION ?? null,
    postgres: version.v.split(" ")[0],
    db: { used, limit: DB_LIMIT_BYTES, free: Math.max(0, DB_LIMIT_BYTES - used), percent: Math.min(100, (100 * used) / DB_LIMIT_BYTES) },
    tables: top,
    otherTablesBytes: rest,
    files: { ...files, blobLimit: BLOB_LIMIT_BYTES, blobPercent: Math.min(100, (100 * files.blob_bytes) / BLOB_LIMIT_BYTES) },
    connections: conn,
    activity,
  };
}
