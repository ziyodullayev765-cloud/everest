import { sql } from "drizzle-orm";
import { BookOpen, GraduationCap, Shield, UsersRound } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { ownProfile } from "@/server/services/users";
import { getSettings } from "@/server/services/settings";
import { studentClasses } from "@/server/services/classes";
import { gamificationSummary } from "@/server/services/gamification";
import { NOTIFICATION_TYPES } from "@/server/services/notifications";
import { db } from "@/server/db";
import { formatDate } from "@/lib/dates";
import { fmtPercent } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import { LinkButton } from "@/components/ui/button";
import { ThemeSwitcher } from "./theme";
import { ProfileSettings } from "./profile-settings";

export async function ProfileView({ user }: { user: SessionUser }) {
  const [p, settings] = await Promise.all([ownProfile(user.id), getSettings()]);
  const isStudent = user.role === "student";
  const [classes, game, summary] = isStudent
    ? await Promise.all([
        studentClasses(user.id),
        gamificationSummary(user.id),
        db.execute<{ submitted: number; quizzes: number; avg: string | null; graded: number }>(sql`
          select (select count(*)::int from submissions where student_id = ${user.id} and version > 0) as submitted,
            (select count(*)::int from quiz_attempts where student_id = ${user.id} and status <> 'in_progress') as quizzes,
            (select avg(percent) from grades where student_id = ${user.id}) as avg,
            (select count(*)::int from grades where student_id = ${user.id}) as graded`),
      ])
    : [[], null, null];
  const s = summary?.[0];
  const prefTypes = Object.entries(NOTIFICATION_TYPES).filter(([k]) => k !== "system" && (isStudent ? k !== "submission" : true));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Profil" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-5">
          <Card>
            <CardBody className="flex flex-col items-center text-center">
              <Avatar name={p.displayName} fileId={p.avatarFileId} size={88} />
              <h2 className="mt-3 text-[18px] font-semibold">{p.displayName}</h2>
              <p className="text-[13px] text-muted">@{p.username}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                <Badge tone="primary">{t.role[p.role]}</Badge>
                {p.studentCode ? <Badge>ID: {p.studentCode}</Badge> : null}
              </div>
              <p className="mt-3 text-[12px] text-muted">{formatDate(p.createdAt)} dan beri a’zo</p>
            </CardBody>
          </Card>
          {isStudent ? (
            <Card>
              <CardHeader title="Guruhlar" icon={<UsersRound />} />
              <CardBody className="pt-3">
                {classes.length ? (
                  <ul className="space-y-2 text-[13.5px]">
                    {classes.map((c) => (
                      <li key={c.id}>
                        <a href={`/classes/${c.id}`} className="font-medium hover:text-primary">
                          {c.name}
                        </a>
                        {c.level ? <div className="text-[12px] text-muted">{c.level}</div> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-muted">Hali guruhga biriktirilmagansiz.</p>
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          {isStudent && s ? (
            <Card>
              <CardHeader title="O‘quv xulosasi" icon={<GraduationCap />} />
              <CardBody className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-4">
                {[
                  ["Topshirilgan", s.submitted],
                  ["Quizlar", s.quizzes],
                  ["O‘rtacha", fmtPercent(s.avg == null ? null : Number(s.avg))],
                  ["Seriya", `${game?.streak.current ?? 0} kun`],
                ].map(([l, v]) => (
                  <div key={String(l)} className="rounded-xl bg-surface-2 px-3.5 py-3">
                    <div className="text-[12px] text-muted">{l}</div>
                    <div className="mt-0.5 text-[18px] font-semibold tabular">{v}</div>
                  </div>
                ))}
              </CardBody>
              <div className="flex flex-wrap gap-2 px-5 pb-5">
                <LinkButton href="/grades" variant="secondary" size="sm">
                  <BookOpen /> Baholar tarixi
                </LinkButton>
                <LinkButton href="/quizzes" variant="secondary" size="sm">
                  Quizlar tarixi
                </LinkButton>
                <LinkButton href="/assignments" variant="secondary" size="sm">
                  Vazifalar tarixi
                </LinkButton>
                {settings.gamification.enabled ? (
                  <LinkButton href="/achievements" variant="secondary" size="sm">
                    Yutuqlar
                  </LinkButton>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Ko‘rinish" />
            <CardBody className="pt-3">
              <ThemeSwitcher />
            </CardBody>
          </Card>

          <ProfileSettings
            isStudent={isStudent}
            canEditName={!isStudent || settings.profile.studentsCanEditDisplayName}
            canEditAvatar={!isStudent || settings.profile.studentsCanEditAvatar}
            gamificationAvailable={isStudent && settings.gamification.enabled}
            initial={{ displayName: p.displayName, avatarFileId: p.avatarFileId, weeklyTaskGoal: p.weeklyTaskGoal, dailyXpGoal: p.dailyXpGoal, dailyGoal: p.dailyGoal, gamificationEnabled: p.gamificationEnabled, notificationPrefs: p.notificationPrefs ?? {} }}
            prefTypes={prefTypes}
          />

          <Card>
            <CardHeader title="Xavfsizlik" icon={<Shield />} description="Parolni o‘zgartirsangiz, boshqa qurilmalardagi seanslar yopiladi." />
            <CardBody className="pt-3">
              <LinkButton href="/change-password" variant="secondary">
                Parolni o‘zgartirish
              </LinkButton>
              <p className="mt-3 text-[12.5px] text-muted">Shaxsiy ma’lumotlaringiz faqat sizga, o‘qituvchilaringizga va ma’muriyatga ko‘rinadi. Boshqa o‘quvchilar sizning baholaringizni ko‘ra olmaydi.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
