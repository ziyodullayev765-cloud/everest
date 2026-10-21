import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { BrandStyle } from "@/components/app/brand-style";
import { AppShell, type NavSection } from "@/components/app/shell";
import { logoutAction } from "@/app/actions/auth";
import { unreadCount } from "@/server/services/notifications";
import { getSettings } from "@/server/services/settings";
import { can } from "@/server/auth/rbac";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: { default: "O‘qituvchi", template: "%s · O‘qituvchi" } };

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser("teacher");
  const [unread, settings] = await Promise.all([unreadCount(user.id), getSettings()]);
  const sections: NavSection[] = [
    {
      items: [
        { href: "/teacher", label: t.nav.overview, icon: "dashboard", exact: true },
        { href: "/teacher/submissions", label: t.nav.submissions, icon: "inbox" },
        { href: "/teacher/assignments", label: t.nav.content, icon: "builder" },
        ...(can(user, "assignments.create") ? [{ href: "/teacher/bank", label: t.nav.questionBank, icon: "bank" }] : []),
        { href: "/teacher/gradebook", label: t.nav.gradebook, icon: "gradebook" },
        { href: "/teacher/library", label: t.nav.library, icon: "subjects" },
        { href: "/teacher/classes", label: t.nav.classes, icon: "classes" },
      ],
    },
    {
      title: "Hisob",
      items: [
        { href: "/teacher/notifications", label: t.nav.notifications, icon: "notifications" },
        { href: "/teacher/profile", label: t.nav.profile, icon: "profile" },
      ],
    },
  ];
  return (
    <>
    <BrandStyle color={settings.branding.primaryColor} />
    <AppShell
      appName={settings.branding.shortName}
      logoFileId={settings.branding.logoFileId}
      areaLabel={t.nav.teacher}
      sections={sections}
      user={{ displayName: user.displayName, avatarFileId: user.avatarFileId, roleLabel: t.role.teacher }}
      unread={unread}
      logout={logoutAction}
      profileHref="/teacher/profile"
      notificationsHref="/teacher/notifications"
    >
      {children}
    </AppShell>
    </>
  );
}
