"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Target } from "lucide-react";
import { updateProfileAction } from "@/app/actions/student";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Switch } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { uploadFile } from "./uploader";

type Initial = { displayName: string; avatarFileId: string | null; weeklyTaskGoal: number; dailyXpGoal: number; dailyGoal: number; gamificationEnabled: boolean; notificationPrefs: Record<string, boolean> };

export function ProfileSettings({ isStudent, canEditName, canEditAvatar, gamificationAvailable, initial, prefTypes }: { isStudent: boolean; canEditName: boolean; canEditAvatar: boolean; gamificationAvailable: boolean; initial: Initial; prefTypes: [string, string][] }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const save = (patch: Partial<Initial>, msg = "Saqlandi") =>
    start(async () => {
      const r = await updateProfileAction(patch);
      if (r.ok) {
        toast.success(msg);
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <>
      <Card>
        <CardHeader title="Shaxsiy ma’lumotlar" description={!canEditName && !canEditAvatar ? "Ma’lumotlarni faqat administrator o‘zgartira oladi." : undefined} />
        <CardBody className="space-y-4 pt-4">
          <div className="flex items-center gap-4">
            <Avatar name={v.displayName} fileId={v.avatarFileId} size={56} />
            {canEditAvatar ? (
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-border bg-surface px-3 text-[13px] font-medium hover:bg-surface-2">
                  {uploading ? "Yuklanmoqda…" : "Rasm yuklash"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      setUploading(true);
                      try {
                        const up = await uploadFile(f, { imagesOnly: true });
                        setV((x) => ({ ...x, avatarFileId: up.id }));
                        save({ avatarFileId: up.id }, "Rasm yangilandi");
                      } catch (err) {
                        toast.error((err as Error).message);
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                </label>
                {v.avatarFileId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setV((x) => ({ ...x, avatarFileId: null }));
                      save({ avatarFileId: null }, "Rasm olib tashlandi");
                    }}
                  >
                    Olib tashlash
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          {canEditName ? (
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                save({ displayName: v.displayName });
              }}
            >
              <Field label="Ko‘rinadigan ism" htmlFor="dn" className="flex-1">
                <Input id="dn" value={v.displayName} onChange={(e) => setV({ ...v, displayName: e.target.value })} maxLength={80} />
              </Field>
              <Button type="submit" variant="secondary" loading={pending}>
                Saqlash
              </Button>
            </form>
          ) : null}
        </CardBody>
      </Card>

      {isStudent ? (
        <Card id="goals">
          <CardHeader title="O‘quv maqsadlari" icon={<Target />} />
          <CardBody className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kunlik maqsad (mashg‘ulotlar)" htmlFor="dg" hint="Vazifa, quiz yoki 10 ta so‘z takrorlash = 1 mashg‘ulot. 1–20">
                <Input id="dg" type="number" inputMode="numeric" min={1} max={20} value={v.dailyGoal} onChange={(e) => setV({ ...v, dailyGoal: Number(e.target.value) })} />
              </Field>
              <Field label="Haftasiga bajariladigan ishlar" htmlFor="wg" hint="1–100">
                <Input id="wg" type="number" inputMode="numeric" min={1} max={100} value={v.weeklyTaskGoal} onChange={(e) => setV({ ...v, weeklyTaskGoal: Number(e.target.value) })} />
              </Field>
              {gamificationAvailable ? (
                <Field label="Kunlik XP maqsadi" htmlFor="xg" hint="5–1000">
                  <Input id="xg" type="number" inputMode="numeric" min={5} max={1000} value={v.dailyXpGoal} onChange={(e) => setV({ ...v, dailyXpGoal: Number(e.target.value) })} />
                </Field>
              ) : null}
            </div>
            {gamificationAvailable ? (
              <Switch checked={v.gamificationEnabled} onChange={(x) => setV({ ...v, gamificationEnabled: x })} label="XP, darajalar va nishonlarni ko‘rsatish" description="O‘chirsangiz ham baholaringizga ta’sir qilmaydi." />
            ) : null}
            <Button variant="secondary" loading={pending} onClick={() => save({ dailyGoal: v.dailyGoal, weeklyTaskGoal: v.weeklyTaskGoal, dailyXpGoal: v.dailyXpGoal, gamificationEnabled: v.gamificationEnabled })}>
              Maqsadlarni saqlash
            </Button>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Bildirishnomalar" icon={<Bell />} description="Ilova ichidagi bildirishnomalar. E-pochta/push xabarnomalar hozircha sozlanmagan." />
        <CardBody className="divide-y divide-border pt-2">
          {prefTypes.map(([k, label]) => (
            <div key={k} className="py-2.5">
              <Switch
                checked={v.notificationPrefs[k] !== false}
                onChange={(x) => {
                  const prefs = { ...v.notificationPrefs, [k]: x };
                  setV({ ...v, notificationPrefs: prefs });
                  save({ notificationPrefs: prefs });
                }}
                label={label}
              />
            </div>
          ))}
        </CardBody>
      </Card>
    </>
  );
}
