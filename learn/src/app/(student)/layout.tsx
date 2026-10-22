import { pageUser } from "@/server/auth/guards";
import { BrandStyle } from "@/components/app/brand-style";
import { AppShell, type NavSection } from "@/components/app/shell";
import { logoutAction } from "@/app/actions/auth";
import { unreadCount } from "@/server/services/notifications";
import { getSettings } from "@/server/services/settings";
import { t } from "@/lib/i18n";
import { tutorEnabled } from "@/server/services/tutor";
import { AchievementUnlock } from "@/components/student/achievement-unlock";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser("student");
  const [unread, settings] = await Promise.all([unreadCount(user.id), getSettings()]);
  const tabs = [
    { href: "/", label: t.nav.home, icon: "home", exact: true },
    { href: "/assignments", label: t.nav.homework, icon: "assignments" },
    { href: "/vocabulary", label: "So‘zlar", icon: "words" },
    { href: "/quizzes", label: t.nav.quizzes, icon: "quizzes" },
    { href: "/profile", label: t.nav.profile, icon: "profile" },
  ];
  const sections: NavSection[] = [
    { items: tabs.slice(0, 4) },
    {
      title: "Mashq",
      items: [
        { href: "/grammar", label: t.nav.grammar, icon: "grammar" },
        { href: "/reading", label: t.nav.reading, icon: "reading" },
        { href: "/listening", label: t.nav.listening, icon: "listening" },
        ...(tutorEnabled() ? [{ href: "/tutor", label: t.nav.tutor, icon: "tutor" }] : []),
      ],
    },
    {
      title: "Shaxsiy",
      items: [
        { href: "/results", label: t.nav.progress, icon: "results" },
        { href: "/grades", label: t.nav.grades, icon: "grades" },
        ...(settings.gamification.enabled && user.gamificationEnabled ? [{ href: "/achievements", label: t.nav.achievements, icon: "achievements" }] : []),
        { href: "/library", label: t.nav.library, icon: "bank" },
        { href: "/classes", label: t.nav.classes, icon: "classes" },
        { href: "/notifications", label: t.nav.notifications, icon: "notifications" },
        { href: "/profile", label: t.nav.profile, icon: "profile" },
        { href: "/install", label: t.nav.install, icon: "install" },
      ],
    },
  ];
  return (
    <>
    <BrandStyle color={settings.branding.primaryColor} />
    <AppShell
      appName={settings.branding.shortName}
      logoFileId={settings.branding.logoFileId}
      sections={sections}
      tabs={tabs}
      user={{ displayName: user.displayName, avatarFileId: user.avatarFileId, roleLabel: t.role.student }}
      unread={unread}
      logout={logoutAction}
      profileHref="/profile"
      notificationsHref="/notifications"
    >
      {children}
      {settings.gamification.enabled && user.gamificationEnabled ? <AchievementUnlock /> : null}
    </AppShell>
    </>
  );
}
