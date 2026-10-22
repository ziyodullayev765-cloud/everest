import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { adminAchievements } from "@/server/services/achievements";
import { getSettings } from "@/server/services/settings";
import { PageHeader } from "@/components/ui/page";
import { Alert } from "@/components/ui/feedback";
import { AchievementAdmin } from "@/components/admin/achievement-admin";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Yutuqlar"); } };

export default async function Page() {
  const user = await pageUser("admin", "super_admin");
  const [rows, settings] = await Promise.all([adminAchievements(user), getSettings()]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={tr("Yutuqlar")} description={tr("Yutuqlar haqiqiy natijalar asosida avtomatik ochiladi. Bu yerda nom, belgi, shart va XP mukofotini belgilaysiz.")} />
      {!settings.gamification.enabled ? (
        <div className="mb-5">
          <Alert tone="warning">{tr("O‘yin elementlari (XP, nishonlar) Sozlamalarda o‘chirilgan — o‘quvchilar yutuqlarni ko‘rmaydi.")}</Alert>
        </div>
      ) : null}
      <AchievementAdmin rows={rows} />
    </div>
  );
}
