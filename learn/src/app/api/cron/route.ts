import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { promoteScheduled } from "@/server/services/assignments";
import { ensureLastWeekFinalized } from "@/server/services/leaderboard";
import { notify } from "@/server/services/notifications";
import { fillTemplate, getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

/**
 * Background housekeeping, called by a scheduler (e.g. Vercel Cron) with
 * `Authorization: Bearer $CRON_SECRET`. Publishes due scheduled assignments, sends 24-hour deadline
 * reminders and clears expired sessions/rate-limit rows. Everything here is also done lazily on page
 * loads, so the app stays correct if no scheduler is configured.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return NextResponse.json({ ok: false }, { status: 401 });

  const published = await promoteScheduled(true);
  await ensureLastWeekFinalized(); // weekly group medals
  const settings = await getSettings();
  const due = await db.execute<{ assignment_id: string; title: string; student_id: string; quiz: boolean }>(sql`
    select a.id as assignment_id, a.title, u.id as student_id,
      a.type in ('multiple_choice','short_answer','true_false','timed_quiz','practice') as quiz
    from assignments a
    join assignment_targets t on t.assignment_id = a.id
    join users u on u.role = 'student' and u.status = 'active' and (t.student_id = u.id or u.id in (select student_id from class_students where class_id = t.class_id))
    where a.status = 'published' and a.due_at between now() and now() + interval '24 hours'
      and not exists (select 1 from submissions s where s.assignment_id = a.id and s.student_id = u.id and s.version > 0)
      and not exists (select 1 from quiz_attempts q where q.assignment_id = a.id and q.student_id = u.id and q.status <> 'in_progress')
    group by a.id, a.title, u.id`);
  let reminders = 0;
  for (const r of due)
    reminders += await notify([r.student_id], {
      type: "deadline",
      title: fillTemplate(settings.notificationTemplates.deadline, { title: r.title }),
      link: r.quiz ? `/quizzes/${r.assignment_id}` : `/assignments/${r.assignment_id}`,
      dedupeKey: `deadline:${r.assignment_id}`,
    });
  await db.execute(sql`delete from sessions where expires_at < now()`);
  await db.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
  return NextResponse.json({ ok: true, published, reminders });
}
