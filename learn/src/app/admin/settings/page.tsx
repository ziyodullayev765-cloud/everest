import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { getSettings } from "@/server/services/settings";
import { PageHeader } from "@/components/ui/page";
import { SettingsForm } from "@/components/admin/settings-form";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Sozlamalar"); } };

export default async function Page() {
  await pageUser("admin", "super_admin");
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={tr("Platforma sozlamalari")} description={tr("O‘zgarishlar barcha foydalanuvchilar uchun darhol kuchga kiradi va audit jurnaliga yoziladi.")} />
      <SettingsForm initial={s} />
    </div>
  );
}
