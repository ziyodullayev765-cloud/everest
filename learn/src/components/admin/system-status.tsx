import Link from "next/link";
import { Database, HardDrive } from "lucide-react";
import type { SystemStatus } from "@/server/services/system";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn, fmtNumber } from "@/lib/utils";
import { tr } from "@/lib/i18n/tr";

export const fmtBytes = (b: number) => (b >= 1024 ** 3 ? `${fmtNumber(b / 1024 ** 3, 2)} GB` : b >= 1024 ** 2 ? `${fmtNumber(b / 1024 ** 2, 1)} MB` : `${fmtNumber(b / 1024, 0)} KB`);
const tone = (p: number) => (p >= 90 ? "bg-danger" : p >= 70 ? "bg-warning" : "bg-primary");

function Meter({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label={label}>
      <div className={cn("h-full rounded-full", tone(percent))} style={{ width: `${Math.max(1, percent)}%` }} />
    </div>
  );
}

/** Compact card for the admin dashboard. */
export function SystemCard({ s }: { s: SystemStatus }) {
  return (
    <Card className="mb-6">
      <CardHeader title={tr("Baza holati")} icon={<Database />} action={<Link href="/admin/system" className="text-[13px] font-bold text-primary hover:underline">{tr("Batafsil →")}</Link>} />
      <CardBody className="space-y-3 pt-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13.5px]">
          <span><b className="text-success">● {tr("Ishlayapti")}</b> · {tr("javob {0} ms", s.pingMs)}</span>
          <span className="text-muted">{tr("{0} band · {1} bo‘sh ({2} dan)", fmtBytes(s.db.used), fmtBytes(s.db.free), fmtBytes(s.db.limit))}</span>
        </div>
        <Meter percent={s.db.percent} label={tr("Baza joyi")} />
        <p className="text-[12.5px] text-muted">
          {tr("{0}% band", fmtNumber(s.db.percent, 1))} · {tr("24 soatda: {0} kirish, {1} so‘z takrori, {2} topshiriq", s.activity.logins, s.activity.reviews, s.activity.submissions)}
        </p>
      </CardBody>
    </Card>
  );
}

/** Full system page. */
export function SystemDetails({ s }: { s: SystemStatus }) {
  const stat = (label: string, value: string | number, hint?: string) => (
    <div className="rounded-2xl border-2 border-border px-4 py-3">
      <div className="text-[12px] font-semibold text-muted">{label}</div>
      <div className="text-[22px] leading-tight font-black tabular">{value}</div>
      {hint ? <div className="text-[11.5px] text-muted">{hint}</div> : null}
    </div>
  );
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={tr("Joy")} icon={<HardDrive />} description={tr("Neon Free tarifi: bitta loyihaga 1 GB. Chegara oshsa, yangi ma’lumot yozilmay qoladi.")} />
        <CardBody className="space-y-4 pt-2">
          <div>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <b className="text-[15px]">{tr("Ma’lumotlar bazasi")}</b>
              <span className="text-[13.5px]"><b>{fmtBytes(s.db.used)}</b> / {fmtBytes(s.db.limit)} · <span className="text-success">{tr("{0} bo‘sh", fmtBytes(s.db.free))}</span></span>
            </div>
            <Meter percent={s.db.percent} label={tr("Baza joyi")} />
            <p className="mt-1 text-[12.5px] text-muted">{tr("{0}% band", fmtNumber(s.db.percent, 1))}{s.db.percent >= 80 ? ` · ${tr("Joy kam qoldi — eski fayllarni Blob’ga ko‘chirish yoki tarifni oshirish kerak.")}` : ""}</p>
          </div>
          <div>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <b className="text-[15px]">{tr("Katta fayllar ombori (Vercel Blob)")}</b>
              <span className="text-[13.5px]"><b>{fmtBytes(s.files.blob_bytes)}</b> / {fmtBytes(s.files.blobLimit)}</span>
            </div>
            <Meter percent={s.files.blobPercent} label={tr("Fayl ombori")} />
            <p className="mt-1 text-[12.5px] text-muted">{tr("{0} ta fayl (kitoblar, audio). Bazadagi kichik fayllar: {1} ta, {2}. Oxirgi 7 kunda yuklangan: {3}.", s.files.blob_count, s.files.db_count, fmtBytes(s.files.db_bytes), fmtBytes(s.files.week_bytes))}</p>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat(tr("Holat"), tr("Ishlayapti"), tr("javob {0} ms", s.pingMs))}
        {stat(tr("Ulanishlar"), `${s.connections.total}`, tr("{0} tasi hozir so‘rov bajaryapti", s.connections.active))}
        {stat(tr("So‘nggi 1 soatda faol"), s.activity.online, tr("foydalanuvchi"))}
        {stat(tr("PostgreSQL"), s.postgres, s.region ? tr("server: {0}", s.region) : undefined)}
      </div>

      <Card>
        <CardHeader title={tr("So‘nggi 24 soatda nima bo‘ldi")} />
        <CardBody className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
          {stat(tr("Kirishlar"), s.activity.logins)}
          {stat(tr("So‘z takrorlari"), s.activity.reviews)}
          {stat(tr("Topshirilgan ishlar"), s.activity.submissions)}
          {stat(tr("Quiz urinishlari"), s.activity.attempts)}
          {stat(tr("Lug‘at importlari"), s.activity.imports)}
          {stat(tr("Jami harakatlar"), s.activity.actions)}
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={tr("Eng katta jadvallar")} description={tr("Joyni nima egallayapti (indekslar bilan birga)")} />
        <div className="overflow-x-auto" data-no-pull>
          <table className="w-full min-w-[480px] text-[13.5px]">
            <thead className="bg-surface-2 text-left text-[12px] text-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">{tr("Jadval")}</th>
                <th className="px-3 py-2 text-right font-semibold">{tr("Yozuvlar")}</th>
                <th className="px-3 py-2 text-right font-semibold">{tr("Hajmi")}</th>
                <th className="w-40 px-4 py-2 font-semibold">{tr("Ulushi")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {s.tables.map((t) => (
                <tr key={t.name}>
                  <td className="px-4 py-2"><span className="font-semibold">{tr(t.label)}</span> <span className="text-[11.5px] text-muted">{t.name}</span></td>
                  <td className="px-3 py-2 text-right tabular">{fmtNumber(t.rows)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap tabular">{fmtBytes(t.bytes)}</td>
                  <td className="px-4 py-2"><Meter percent={(100 * t.bytes) / s.db.used} label={t.name} /></td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-2 text-muted">{tr("Qolgan jadvallar")}</td>
                <td />
                <td className="px-3 py-2 text-right whitespace-nowrap tabular text-muted">{fmtBytes(s.otherTablesBytes)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-[12.5px] text-muted">{tr("Neon hisoblagan joy bu yerdagidan biroz farq qilishi mumkin (o‘zgarishlar tarixi ham hisoblanadi). Hisoblash vaqti (100 CU-soat/oy) Neon konsolida ko‘rinadi.")}</p>
    </div>
  );
}
