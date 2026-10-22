import { BarChart3, CalendarCheck2, Sparkles } from "lucide-react";
import { Logo, LogoMark } from "@/components/app/logo";
import { getSettings } from "@/server/services/settings";
import { LanguageSwitch } from "@/components/app/language-switch";
import { tr } from "@/lib/i18n/tr";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.55] [background:radial-gradient(60%_50%_at_20%_10%,var(--primary-soft),transparent_70%),radial-gradient(50%_40%_at_90%_90%,var(--info-soft),transparent_70%)]" aria-hidden />
        <svg className="pointer-events-none absolute right-0 bottom-0 w-[80%] text-primary/[0.07]" viewBox="0 0 600 300" aria-hidden>
          <path d="M0 300 L170 90 L260 200 L330 120 L470 300 Z" fill="currentColor" />
          <path d="M150 300 L380 40 L600 300 Z" fill="currentColor" />
        </svg>
        <div className="relative">
          <Logo name={s.branding.appName} />
        </div>
        <div className="relative max-w-md">
          <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.03em] text-text">{tr("O‘qish — tartibli, qiziqarli va natijali.")}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{tr("Vazifalar, quizlar, baholar va shaxsiy natijalaringiz — barchasi bir joyda, telefoningizda ham.")}</p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: CalendarCheck2, t: tr("Kunlik reja"), d: tr("Bugungi vazifalar va yaqinlashayotgan muddatlar") },
              { icon: Sparkles, t: tr("Interaktiv quizlar"), d: tr("Darhol natija va tushuntirishlar") },
              { icon: BarChart3, t: tr("Shaxsiy tahlil"), d: tr("Haftalik o‘sish, kuchli tomonlar va maqsadlar") },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-primary shadow-soft">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-bold text-text">{t}</span>
                  <span className="block text-[13px] text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[12px] text-muted">© {new Date().getFullYear()} {s.branding.appName}</p>
      </aside>
      <main className="flex flex-col px-5 pt-safe pb-safe">
        <div className="flex justify-end pt-4">
          <LanguageSwitch compact />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="mb-8 flex justify-center lg:hidden">
            <LogoMark size={52} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
