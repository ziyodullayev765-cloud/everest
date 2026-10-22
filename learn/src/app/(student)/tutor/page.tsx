import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { pageUser } from "@/server/auth/guards";
import { TUTOR_KINDS, tutorEnabled, tutorUsage, type TutorKind } from "@/server/services/tutor";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { TutorChat } from "./tutor-chat";

export const metadata: Metadata = { title: "AI yordamchi" };
export const dynamic = "force-dynamic";

export default async function TutorPage({ searchParams }: { searchParams: Promise<{ kind?: string; text?: string }> }) {
  const user = await pageUser("student");
  const sp = await searchParams;
  if (!tutorEnabled())
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="AI yordamchi" />
        <Card>
          <EmptyState icon={<Bot />} title="AI yordamchi hozircha o‘chirilgan" description="Bu imkoniyat administrator AI xizmatini ulaganidan keyin ishlaydi." />
        </Card>
      </div>
    );
  const usage = await tutorUsage(user.id);
  const kind = (sp.kind && sp.kind in TUTOR_KINDS ? sp.kind : "grammar") as TutorKind;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="AI yordamchi" description="Grammatika, xatolar, so‘zlar va yozganlaringiz bo‘yicha tushuntirish. Javoblar sun’iy intellekt tomonidan yaratiladi — muhim joylarni ustozingiz bilan tekshiring." />
      <TutorChat kinds={TUTOR_KINDS} initialKind={kind} initialText={(sp.text ?? "").slice(0, 4000)} remaining={Math.max(0, usage.limit - usage.used)} limit={usage.limit} />
    </div>
  );
}
