"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, ClipboardList, Gauge, Languages, Palette, Plus, Save, Trash2, UserCog, Zap } from "lucide-react";
import { settingsAction } from "@/app/actions/admin";
import type { PlatformSettings } from "@/server/services/settings";
import { XP_RULE_LABELS, type XpRules } from "@/lib/gamification";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Switch, Checkbox } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";
import { uploadFile } from "@/components/app/uploader";

export function SettingsForm({ initial }: { initial: PlatformSettings }) {
  const [s, setS] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const patch = <K extends keyof PlatformSettings>(k: K, v: Partial<PlatformSettings[K]>) => setS((x) => ({ ...x, [k]: { ...x[k], ...v } }));
  const save = () =>
    start(async () => {
      setError(null);
      const r = await settingsAction(s);
      if (r.ok) {
        toast.success("Sozlamalar saqlandi");
        router.refresh();
      } else setError(r.error);
    });

  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Card>
        <CardHeader title="Brending" icon={<Palette />} />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Platforma nomi"><Input value={s.branding.appName} onChange={(e) => patch("branding", { appName: e.target.value })} /></Field>
            <Field label="Qisqa nom" hint="Menyuda ko‘rinadi"><Input value={s.branding.shortName} onChange={(e) => patch("branding", { shortName: e.target.value })} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Asosiy rang" hint="Yorug‘ rejimdagi aksent rangi">
              <div className="flex gap-2">
                <input type="color" value={s.branding.primaryColor} onChange={(e) => patch("branding", { primaryColor: e.target.value })} className="h-10 w-14 cursor-pointer rounded-xl border border-border" aria-label="Rang" />
                <Input value={s.branding.primaryColor} onChange={(e) => patch("branding", { primaryColor: e.target.value })} />
              </div>
            </Field>
            <Field label="Logo" hint="PNG/WebP, kvadrat">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.branding.logoFileId ? <img src={`/api/files/${s.branding.logoFileId}`} alt="" className="size-10 rounded-xl border border-border object-cover" /> : null}
                <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-border px-3 text-[13px] font-semibold hover:bg-surface-2">
                  Yuklash
                  <input type="file" hidden accept="image/png,image/webp,image/jpeg" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { patch("branding", { logoFileId: (await uploadFile(f, { imagesOnly: true, visibility: "public" })).id }); } catch (err) { toast.error((err as Error).message); } }} />
                </label>
                {s.branding.logoFileId ? <Button variant="ghost" size="sm" onClick={() => patch("branding", { logoFileId: null })}>Olib tashlash</Button> : null}
              </div>
            </Field>
          </div>
          <p className="text-[12.5px] text-muted">Ilova belgisi (bosh ekran ikonkasi) statik fayllardan olinadi — uni almashtirish uchun public/icons dagi rasmlarni yangilang (README).</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Baholash shkalasi" icon={<Gauge />} description="Foizdan baho belgisiga o‘tkazish. Yangi baholarga qo‘llanadi; mavjud baholar o‘zgarmaydi." />
        <CardBody className="space-y-2">
          {[...s.grading.scale].map((b, i) => (
            <div key={i} className="grid grid-cols-[90px_80px_1fr_auto] items-center gap-2">
              <Input type="number" min={0} max={100} value={b.min} onChange={(e) => patch("grading", { scale: s.grading.scale.map((x, j) => (j === i ? { ...x, min: Number(e.target.value) } : x)) })} aria-label="Minimal foiz" />
              <Input value={b.label} onChange={(e) => patch("grading", { scale: s.grading.scale.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label="Belgi" />
              <Input value={b.name} onChange={(e) => patch("grading", { scale: s.grading.scale.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} aria-label="Nomi" />
              <Button variant="ghost" size="icon" onClick={() => patch("grading", { scale: s.grading.scale.filter((_, j) => j !== i) })} aria-label="O‘chirish"><Trash2 /></Button>
            </div>
          ))}
          <p className="text-[12px] text-muted">Ustunlar: minimal %, belgi, nomi. 0 dan boshlanadigan oraliq bo‘lishi shart.</p>
          <Button variant="secondary" size="sm" onClick={() => patch("grading", { scale: [...s.grading.scale, { min: 0, label: "", name: "" }] })}><Plus /> Oraliq</Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Gamifikatsiya va XP" icon={<Zap />} description="XP faqat motivatsiya uchun — rasmiy baholarga ta’sir qilmaydi." />
        <CardBody className="space-y-4">
          <Switch checked={s.gamification.enabled} onChange={(v) => patch("gamification", { enabled: v })} label="XP, darajalar, nishonlar va seriyalarni yoqish" />
          {s.gamification.enabled ? (
            <div className="divide-y divide-border">
              {(Object.keys(XP_RULE_LABELS) as (keyof XpRules)[]).map((k) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2">
                  <span className="text-[13.5px] text-text-2">{XP_RULE_LABELS[k]}</span>
                  <Input type="number" min={0} max={1000} value={s.gamification.rules[k]} onChange={(e) => patch("gamification", { rules: { ...s.gamification.rules, [k]: Number(e.target.value) } })} className="h-9 w-24 text-right" aria-label={XP_RULE_LABELS[k]} />
                </div>
              ))}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Vazifa standartlari" icon={<ClipboardList />} description="Yangi vazifa yaratilganda oldindan to‘ldiriladi" />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Maksimal ball"><Input type="number" min={1} max={1000} value={s.assignmentDefaults.maxScore} onChange={(e) => patch("assignmentDefaults", { maxScore: Number(e.target.value) })} /></Field>
            <Field label="Kechikish jarimasi, %"><Input type="number" min={0} max={100} value={s.assignmentDefaults.latePenaltyPercent} onChange={(e) => patch("assignmentDefaults", { latePenaltyPercent: Number(e.target.value) })} /></Field>
            <Field label="Quiz urinishlari"><Input type="number" min={1} max={20} value={s.assignmentDefaults.maxAttempts} onChange={(e) => patch("assignmentDefaults", { maxAttempts: Number(e.target.value) })} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Natijalarni ko‘rsatish">
              <Select value={s.assignmentDefaults.reviewMode} onChange={(e) => patch("assignmentDefaults", { reviewMode: e.target.value as "never" })}>
                <option value="after_submit">Topshirgandan so‘ng</option>
                <option value="after_due">Muddatdan so‘ng</option>
                <option value="after_grading">Baholangandan so‘ng</option>
                <option value="never">Ko‘rsatmaslik</option>
              </Select>
            </Field>
            <div className="pt-6"><Switch checked={s.assignmentDefaults.allowLate} onChange={(v) => patch("assignmentDefaults", { allowLate: v })} label="Kechikib topshirishga ruxsat" /></div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Profil ruxsatlari" icon={<UserCog />} description="O‘quvchilar o‘zlari nimani o‘zgartira oladi" />
        <CardBody className="space-y-2">
          <Switch checked={s.profile.studentsCanEditDisplayName} onChange={(v) => patch("profile", { studentsCanEditDisplayName: v })} label="Ismni o‘zgartirish" />
          <Switch checked={s.profile.studentsCanEditAvatar} onChange={(v) => patch("profile", { studentsCanEditAvatar: v })} label="Profil rasmini o‘zgartirish" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Tillar" icon={<Languages />} description="Interfeys o‘zbek tilida. Ingliz va rus tarjimalari qisman tayyor — to‘liq tarjimadan so‘ng yoqing." />
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {[["uz", "O‘zbekcha"], ["en", "English"], ["ru", "Русский"]].map(([k, l]) => (
              <Checkbox key={k} className="rounded-lg border border-border px-3 py-2" checked={s.languages.enabled.includes(k)} onChange={(v) => patch("languages", { enabled: v ? [...s.languages.enabled, k] : s.languages.enabled.filter((x) => x !== k) })} label={l} />
            ))}
          </div>
          <Field label="Asosiy til" className="max-w-xs">
            <Select value={s.languages.default} onChange={(e) => patch("languages", { default: e.target.value })}>
              <option value="uz">O‘zbekcha</option>
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Bildirishnoma shablonlari" icon={<Bell />} description="{title} — vazifa nomi bilan almashtiriladi" />
        <CardBody className="space-y-3">
          {([
            ["newAssignment", "Yangi vazifa"],
            ["deadline", "Muddat eslatmasi"],
            ["graded", "Baho e’lon qilindi"],
            ["weekly", "Haftalik hisobot"],
          ] as const).map(([k, l]) => (
            <Field key={k} label={l}><Input value={s.notificationTemplates[k]} onChange={(e) => patch("notificationTemplates", { [k]: e.target.value })} /></Field>
          ))}
          <p className="text-[12.5px] text-muted">E-pochta va push xabarnomalar hozircha ulanmagan — faqat ilova ichidagi bildirishnomalar yuboriladi (README → Bildirishnomalar).</p>
        </CardBody>
      </Card>

      <div className="sticky bottom-4 z-10 flex justify-end rounded-3xl border-2 border-border bg-surface/95 p-3 shadow-pop backdrop-blur">
        <Button onClick={save} loading={pending}><Save /> Saqlash</Button>
      </div>
    </div>
  );
}
