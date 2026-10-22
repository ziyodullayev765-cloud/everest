import Link from "next/link";
import { ArrowLeft, Info, KeyRound, Languages, Lock, Moon, Shield } from "lucide-react";
import type { SessionUser } from "@/server/auth/session";
import { ownProfile } from "@/server/services/users";
import { getSettings } from "@/server/services/settings";
import { NOTIFICATION_TYPES } from "@/server/services/notifications";
import { formatDate } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ThemeSwitcher } from "./theme";
import { ProfileSettings } from "./profile-settings";
import { SoundToggle } from "./sound-toggle";
import { LogoutButton } from "./logout-button";
import { LanguageSwitch } from "./language-switch";
import { OfflineStatus } from "./offline-status";
import { tr } from "@/lib/i18n/tr";

export async function ProfileSettingsView({ user, backHref }: { user: SessionUser; backHref: string }) {
  const [p, settings] = await Promise.all([ownProfile(user.id), getSettings()]);
  const isStudent = user.role === "student";
  const prefTypes = Object.entries(NOTIFICATION_TYPES)
    .filter(([k]) => k !== "system" && (isStudent ? k !== "submission" : true))
    .map(([k, l]) => [k, tr(l)] as [string, string]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={backHref} aria-label={tr("Profilga qaytish")} className="grid size-10 place-items-center rounded-full border-2 border-border bg-surface hover:bg-surface-2">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-[24px] font-black">{tr("Sozlamalar")}</h1>
      </div>

      <ProfileSettings
        isStudent={isStudent}
        canEditName={!isStudent || settings.profile.studentsCanEditDisplayName}
        canEditAvatar={!isStudent || settings.profile.studentsCanEditAvatar}
        gamificationAvailable={isStudent && settings.gamification.enabled}
        initial={{ displayName: p.displayName, avatarFileId: p.avatarFileId, weeklyTaskGoal: p.weeklyTaskGoal, dailyXpGoal: p.dailyXpGoal, dailyGoal: p.dailyGoal, gamificationEnabled: p.gamificationEnabled, notificationPrefs: p.notificationPrefs ?? {} }}
        prefTypes={prefTypes}
      />

      <Card>
        <CardHeader title={tr("Til · Language")} icon={<Languages />} />
        <CardBody className="pt-3">
          <LanguageSwitch />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={tr("Tungi rejim va ko‘rinish")} icon={<Moon />} />
        <CardBody className="pt-3">
          <ThemeSwitcher />
        </CardBody>
      </Card>

      <SoundToggle />

      <Card>
        <CardHeader title={tr("Xavfsizlik")} icon={<Shield />} description={tr("Parolni o‘zgartirsangiz, boshqa qurilmalardagi seanslar yopiladi.")} />
        <CardBody className="pt-3">
          <LinkButton href="/change-password" variant="secondary">
            <KeyRound /> {tr("Parolni o‘zgartirish")}
          </LinkButton>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={tr("Maxfiylik va ma’lumotlar")} icon={<Lock />} />
        <CardBody className="space-y-1.5 pt-3 text-[13px] text-text-2">
          <p>{tr("Login:")} <b>@{p.username}</b>{p.studentCode ? <> {tr("· ID:")} <b>{p.studentCode}</b></> : null}</p>
          <p>{tr("{0} dan beri a’zo.", formatDate(p.createdAt))}</p>
          <p className="text-muted">{tr("Shaxsiy ma’lumotlaringiz faqat sizga, o‘qituvchilaringizga va ma’muriyatga ko‘rinadi. Boshqa o‘quvchilar sizning baholaringizni ko‘ra olmaydi.")}</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={tr("Ilova haqida")} icon={<Info />} />
        <CardBody className="pt-3 text-[13px] text-text-2">
          {tr("{0} — ingliz tili kursi uchun o‘quv ilovasi. Til: O‘zbek.", settings.branding.appName)}
          <OfflineStatus />
          <div className="mt-3">
            <LinkButton href="/install" variant="secondary" size="sm">{tr("Ilovani o‘rnatish")}</LinkButton>
          </div>
        </CardBody>
      </Card>

      <LogoutButton />
    </div>
  );
}
