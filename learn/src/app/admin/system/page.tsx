import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { systemStatus } from "@/server/services/system";
import { PageHeader } from "@/components/ui/page";
import { SystemDetails } from "@/components/admin/system-status";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Baza holati"); } };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await pageUser("admin", "super_admin");
  const s = await systemStatus(user);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={{ href: "/admin", label: tr("Umumiy ko‘rinish") }} title={tr("Baza holati")} description={tr("Hozirgi holat: joy, faollik va eng katta jadvallar. Sahifani yangilasangiz, raqamlar yangilanadi.")} />
      <SystemDetails s={s} />
    </div>
  );
}
