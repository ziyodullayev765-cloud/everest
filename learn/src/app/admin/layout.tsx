import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { BrandStyle } from "@/components/app/brand-style";
import { AppShell, type NavSection } from "@/components/app/shell";
import { logoutAction } from "@/app/actions/auth";
import { unreadCount } from "@/server/services/notifications";
import { getSettings } from "@/server/services/settings";
import { t } from "@/lib/i18n";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { title: { default: "Boshqaruv", get template() { return tr("%s · Boshqaruv"); } } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await pageUser("admin", "super_admin");
  const [unread, settings] = await Promise.all([unreadCount(user.id), getSettings()]);
  const sections: NavSection[] = [
    { items: [{ href: "/admin", label: t.nav.overview, icon: "dashboard", exact: true }] },
    {
      title: tr("Odamlar"),
      items: [
        { href: "/admin/students", label: t.nav.students, icon: "students" },
        { href: "/admin/teachers", label: t.nav.teachers, icon: "teachers" },
        { href: "/admin/classes", label: t.nav.classesAdmin, icon: "classes" },
      ],
    },
    {
      title: tr("O‘quv jarayoni"),
      items: [
        { href: "/admin/assignments", label: t.nav.content, icon: "builder" },
        { href: "/admin/vocabulary", label: t.nav.vocabulary, icon: "vocabulary" },
        { href: "/admin/library", label: t.nav.library, icon: "subjects" },
        { href: "/admin/bank", label: t.nav.questionBank, icon: "bank" },
        { href: "/admin/submissions", label: t.nav.submissions, icon: "inbox" },
        { href: "/admin/marks", label: tr("Dars baholari"), icon: "grades" },
        { href: "/admin/gradebook", label: t.nav.gradebook, icon: "gradebook" },
        { href: "/admin/achievements", label: t.nav.achievements, icon: "achievements" },
        { href: "/admin/leaderboard", label: tr("Haftalik reyting"), icon: "leaderboard" },
      ],
    },
    {
      title: tr("Tizim"),
      items: [
        { href: "/admin/settings", label: t.nav.settings, icon: "settings" },
        { href: "/admin/audit", label: t.nav.audit, icon: "audit" },
        { href: "/admin/notifications", label: t.nav.notifications, icon: "notifications" },
        { href: "/admin/profile", label: t.nav.profile, icon: "profile" },
      ],
    },
  ];
  return (
    <>
    <BrandStyle color={settings.branding.primaryColor} />
    <AppShell
      appName={settings.branding.shortName}
      logoFileId={settings.branding.logoFileId}
      areaLabel={t.nav.admin}
      sections={sections}
      user={{ displayName: user.displayName, avatarFileId: user.avatarFileId, roleLabel: t.role[user.role] }}
      unread={unread}
      logout={logoutAction}
      profileHref="/admin/profile"
      notificationsHref="/admin/notifications"
    >
      {children}
    </AppShell>
    </>
  );
}
