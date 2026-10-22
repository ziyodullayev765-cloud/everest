"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, MoreVertical, PlusSquare, Share, Smartphone, Monitor, Info } from "lucide-react";
import { detectPlatform, useInstallPrompt, type Platform } from "@/components/app/pwa";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/tr";

const TABS: { k: Platform; label: string; icon: typeof Smartphone }[] = [
  { k: "ios", get label() { return tr("iPhone / iPad"); }, icon: Smartphone },
  { k: "android", get label() { return tr("Android"); }, icon: Smartphone },
  { k: "desktop", get label() { return tr("Kompyuter"); }, icon: Monitor },
];

function Step({ n, children, icon }: { n: number; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-[14px] font-bold text-primary-fg">{n}</span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pt-1 text-[14.5px]">
        <span>{children}</span>
        {icon ? <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface-2 text-text-2">{icon}</span> : null}
      </div>
    </li>
  );
}

export function InstallGuide() {
  const [tab, setTab] = useState<Platform>("android");
  const [env, setEnv] = useState<ReturnType<typeof detectPlatform> | null>(null);
  const install = useInstallPrompt();
  useEffect(() => {
    const e = detectPlatform();
    setEnv(e);
    setTab(e.platform === "other" ? "android" : e.platform);
  }, []);

  if (env?.standalone)
    return (
      <Alert tone="success" className="mt-6" title={tr("Ilova allaqachon o‘rnatilgan")}>
        {tr("Siz hozir ilovani bosh ekrandan ochgansiz.")}
      </Alert>
    );

  return (
    <div className="mt-6 space-y-5">
      {install.available ? (
        <Card className="border-primary/30">
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-bold">{tr("Brauzeringiz o‘rnatishni taklif qilmoqda")}</div>
              <div className="text-[13.5px] text-muted">{tr("Bir tugma bilan o‘rnating.")}</div>
            </div>
            <Button size="lg" onClick={() => install.prompt()}>
              <Download /> {tr("O‘rnatish")}
            </Button>
          </CardBody>
        </Card>
      ) : null}

      <div className="inline-flex w-full rounded-xl border border-border bg-surface-2 p-1" role="tablist">
        {TABS.map(({ k, label, icon: Icon }) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold text-muted", tab === k && "bg-surface text-text shadow-soft")}>
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      <Card>
        <CardBody>
          {tab === "ios" ? (
            <>
              {env && env.platform === "ios" && !env.iosSafari ? (
                <Alert tone="warning" className="mb-5">
                  {tr("iPhone’da bosh ekranga qo‘shish eng ishonchli tarzda")} <b>{tr("Safari")}</b> {tr("brauzerida ishlaydi. Bu sahifani Safari’da oching.")}
                </Alert>
              ) : null}
              <ol className="space-y-5">
                <Step n={1}>{tr("Saytni")} <b>{tr("Safari")}</b> {tr("brauzerida oching.")}</Step>
                <Step n={2} icon={<Share className="size-4" />}>
                  {tr("Pastdagi (iPad’da — yuqoridagi)")} <b>{tr("Ulashish")}</b> {tr("tugmasini bosing.")}
                </Step>
                <Step n={3} icon={<PlusSquare className="size-4" />}>
                  {tr("Ro‘yxatdan")} <b>{tr("“Add to Home Screen”")}</b> {tr("(“Bosh ekranga qo‘shish”) ni tanlang.")}
                </Step>
                <Step n={4} icon={<CheckCircle2 className="size-4" />}>
                  {tr("Yuqori o‘ngdagi")} <b>{tr("“Add”")}</b> {tr("tugmasini bosib tasdiqlang.")}
                </Step>
              </ol>
              <p className="mt-5 text-[13px] text-muted">{tr("Shundan so‘ng ilova bosh ekrandagi belgidan alohida oynada (manzil satrisiz) ochiladi. iOS 16.4 va undan yangi versiyalarda boshqa brauzerlar ham bu imkoniyatni qo‘llashi mumkin.")}</p>
            </>
          ) : tab === "android" ? (
            <>
              <ol className="space-y-5">
                <Step n={1}>{tr("Saytni")} <b>{tr("Chrome")}</b> {tr("(yoki Samsung Internet, Edge) brauzerida oching.")}</Step>
                <Step n={2} icon={<MoreVertical className="size-4" />}>
                  {tr("Agar pastda")} <b>{tr("“O‘rnatish”")}</b> {tr("taklifi chiqsa — uni bosing. Aks holda yuqori o‘ngdagi")} <b>⋮</b> {tr("menyuni oching.")}
                </Step>
                <Step n={3} icon={<Download className="size-4" />}>
                  <b>{tr("“Install app”")}</b> {tr("(“Ilovani o‘rnatish”) yoki")} <b>{tr("“Add to Home screen”")}</b> {tr("ni tanlang.")}
                </Step>
                <Step n={4} icon={<CheckCircle2 className="size-4" />}>
                  <b>{tr("“Install”")}</b> {tr("ni bosib tasdiqlang.")}
                </Step>
              </ol>
              <p className="mt-5 text-[13px] text-muted">{tr("Menyu nomlari brauzer va uning versiyasiga qarab biroz farq qilishi mumkin. Ba’zi brauzerlar (masalan, ayrim ichki brauzerlar) o‘rnatishni qo‘llamaydi.")}</p>
            </>
          ) : (
            <ol className="space-y-5">
              <Step n={1}>{tr("Chrome yoki Edge brauzerida oching.")}</Step>
              <Step n={2} icon={<Download className="size-4" />}>
                {tr("Manzil satrining o‘ng tomonidagi")} <b>{tr("o‘rnatish")}</b> {tr("belgisini bosing (yoki menyu → “Install Everest”).")}
              </Step>
              <Step n={3}>{tr("Ilova alohida oynada ochiladi va ish stolida belgi paydo bo‘ladi. Safari (macOS Sonoma+) uchun: File → “Add to Dock”.")}</Step>
            </ol>
          )}
        </CardBody>
      </Card>

      <Alert tone="info" title={tr("Oflayn rejim haqida")}>
        <span className="inline-flex gap-1.5">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {tr("Ilova oynasi va asosiy sahifalar internet bo‘lmasa ham ochiladi, lekin vazifalarni topshirish, quiz ishlash va baholarni ko‘rish uchun internet kerak. Shaxsiy ma’lumotlaringiz qurilmada saqlanmaydi.")}
        </span>
      </Alert>
    </div>
  );
}
