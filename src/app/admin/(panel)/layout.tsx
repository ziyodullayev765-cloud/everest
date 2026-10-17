import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AdminShell } from "@/components/admin/admin-shell";
import { SetupNotice } from "@/components/admin/setup-notice";
import { requireAdminPage } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";
import { getProfile, getSettings } from "@/lib/data/public";
import { ownerName } from "@/lib/defaults";
import { initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
  // Installable as its own app (needed for push notifications on iPhone/iPad).
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "Admin", statusBarStyle: "black-translucent" },
};
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  // The unread count runs alongside the admin check (RLS returns nothing to non-admins anyway).
  const [{ user }, { count }, profile, settings] = await Promise.all([
    requireAdminPage(),
    createSessionClient().then((db) =>
      db.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
    ),
    getProfile(),
    getSettings(),
  ]);

  return (
    <AdminShell email={user.email ?? ""} newMessages={count ?? 0} monogram={initials(ownerName(profile, settings)) || "•"}>
      {children}
      <Toaster theme="dark" position="top-right" richColors closeButton />
    </AdminShell>
  );
}
