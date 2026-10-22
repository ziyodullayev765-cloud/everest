"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Users } from "lucide-react";
import { saveAchievementAction, setAchievementActiveAction } from "@/app/actions/admin";
import { ACH_CATEGORIES, MEDAL_ICONS, METRICS, METRIC_KEYS, type AchievementDef, type MetricKey } from "@/lib/achievements";
import { cn, fmtNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { Medal } from "@/components/student/medal";

type Row = AchievementDef & { earners: number };
type Draft = Omit<AchievementDef, "code" | "sortOrder">;

const EMPTY: Draft = { title: "", description: "", category: "reading", icon: "Award", metric: "lessons_done", threshold: 1, xpReward: 20, active: true };

export function AchievementAdmin({ rows }: { rows: Row[] }) {
  const [edit, setEdit] = useState<{ code: string | null; v: Draft } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const toggle = (code: string, active: boolean) =>
    start(async () => {
      const r = await setAchievementActiveAction(code, active);
      if (r.ok) {
        toast.success(active ? "Yutuq yoqildi" : "Yutuq vaqtincha o‘chirildi");
        router.refresh();
      } else toast.error(r.error);
    });

  const save = () =>
    edit &&
    start(async () => {
      const r = await saveAchievementAction(edit.code, edit.v);
      if (r.ok) {
        toast.success("Saqlandi");
        setEdit(null);
        router.refresh();
      } else toast.error(r.error);
    });

  const set = <K extends keyof Draft>(k: K, val: Draft[K]) => setEdit((e) => (e ? { ...e, v: { ...e.v, [k]: val } } : e));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setEdit({ code: null, v: EMPTY })}>
          <Plus /> Yangi yutuq
        </Button>
      </div>

      {ACH_CATEGORIES.map((c) => {
        const list = rows.filter((r) => r.category === c.key);
        if (!list.length) return null;
        return (
          <section key={c.key} className="overflow-hidden rounded-3xl border-2 border-border bg-surface">
            <h2 className="flex items-center gap-2 border-b-2 border-border px-4 py-3 text-[15px] font-black" style={{ color: c.dark }}>
              <span className="size-3 rounded-full" style={{ background: c.color }} aria-hidden /> {c.label} <span className="text-muted">({list.length})</span>
            </h2>
            <ul className="divide-y divide-border">
              {list.map((a) => (
                <li key={a.code} className={cn("flex items-center gap-3 px-4 py-3", !a.active && "opacity-60")}>
                  <Medal icon={a.icon} category={a.category} size={44} locked={!a.active} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-extrabold">{a.title}</div>
                    <div className="truncate text-[12.5px] text-muted">
                      {METRICS[a.metric as MetricKey]?.label ?? a.metric} ≥ {fmtNumber(a.threshold)} · +{a.xpReward} XP
                    </div>
                  </div>
                  <Link href={`/admin/achievements/${a.code}`} className="hidden shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-bold text-text-2 hover:text-primary sm:inline-flex" title="Olgan o‘quvchilar">
                    <Users className="size-3.5" aria-hidden /> {a.earners}
                  </Link>
                  <Switch checked={a.active} onChange={(v) => toggle(a.code, v)} label={<span className="sr-only">Faol</span>} disabled={pending} />
                  <Button variant="ghost" size="icon" aria-label="Tahrirlash" onClick={() => setEdit({ code: a.code, v: { title: a.title, description: a.description, category: a.category, icon: a.icon, metric: a.metric, threshold: a.threshold, xpReward: a.xpReward, active: a.active } })}>
                    <Pencil />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <Dialog
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.code ? "Yutuqni tahrirlash" : "Yangi yutuq"}
        description="Yutuq shart bajarilganda avtomatik ochiladi. XP bir marta beriladi."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEdit(null)}>Bekor qilish</Button>
            <Button onClick={save} loading={pending} disabled={!edit || edit.v.title.trim().length < 2}>Saqlash</Button>
          </>
        }
      >
        {edit ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Medal icon={edit.v.icon} category={edit.v.category} size={72} />
              <div className="min-w-0 flex-1 space-y-3">
                <Field label="Nomi" htmlFor="ach-title" required>
                  <Input id="ach-title" value={edit.v.title} maxLength={60} onChange={(e) => set("title", e.target.value)} placeholder="Masalan: Word Hero" />
                </Field>
              </div>
            </div>
            <Field label="Tavsif" htmlFor="ach-desc">
              <Textarea id="ach-desc" rows={2} maxLength={200} value={edit.v.description} onChange={(e) => set("description", e.target.value)} placeholder="Nima qilish kerak?" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Turkum" htmlFor="ach-cat">
                <Select id="ach-cat" value={edit.v.category} onChange={(e) => set("category", e.target.value as Draft["category"])}>
                  {ACH_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="XP mukofoti" htmlFor="ach-xp">
                <Input id="ach-xp" type="number" min={0} max={1000} value={edit.v.xpReward} onChange={(e) => set("xpReward", Number(e.target.value))} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Field label="Shart" htmlFor="ach-metric">
                <Select id="ach-metric" value={edit.v.metric} onChange={(e) => set("metric", e.target.value as MetricKey)}>
                  {METRIC_KEYS.map((k) => (
                    <option key={k} value={k}>{METRICS[k].label}</option>
                  ))}
                </Select>
              </Field>
              <Field label={`Kamida (${METRICS[edit.v.metric].unit})`} htmlFor="ach-th">
                <Input id="ach-th" type="number" min={1} max={100000} value={edit.v.threshold} onChange={(e) => set("threshold", Number(e.target.value))} />
              </Field>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-semibold text-text-2">Medal belgisi</legend>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
                {MEDAL_ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => set("icon", i)}
                    aria-label={i}
                    aria-pressed={edit.v.icon === i}
                    className={cn("grid place-items-center rounded-2xl border-2 p-1", edit.v.icon === i ? "border-primary bg-primary-soft" : "border-transparent hover:bg-surface-2")}
                  >
                    <Medal icon={i} category={edit.v.category} size={34} />
                  </button>
                ))}
              </div>
            </fieldset>
            <Switch checked={edit.v.active} onChange={(v) => set("active", v)} label="Faol" description="O‘chirilgan yutuq yangi o‘quvchilarga ochilmaydi; olinganlari saqlanadi." />
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
