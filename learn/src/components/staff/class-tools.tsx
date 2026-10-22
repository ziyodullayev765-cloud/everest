"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Target } from "lucide-react";
import { announceAction, challengeAction } from "@/app/actions/staff";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { tr } from "@/lib/i18n/tr";

export function ClassTools({ classId }: { classId: string }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ch, setCh] = useState({ title: "", targetSubmissions: 20, days: 7 });
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader title={tr("E’lon yuborish")} icon={<Megaphone />} description={tr("Guruhdagi barcha o‘quvchilarga bildirishnoma")} />
        <CardBody className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("Sarlavha")} aria-label={tr("Sarlavha")} maxLength={120} />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={tr("Matn…")} aria-label={tr("Matn")} maxLength={5000} />
          <Button
            loading={pending}
            disabled={title.trim().length < 2 || body.trim().length < 2}
            onClick={() =>
              start(async () => {
                const r = await announceAction(classId, { title, body });
                if (r.ok) {
                  toast.success(tr("E’lon yuborildi"));
                  setTitle("");
                  setBody("");
                  router.refresh();
                } else toast.error(r.error);
              })
            }
          >
            {tr("Yuborish")}
          </Button>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={tr("Guruh musobaqasi")} icon={<Target />} description={tr("Umumiy maqsad: guruh birgalikda nechta ish topshiradi")} />
        <CardBody className="space-y-3">
          <Input value={ch.title} onChange={(e) => setCh({ ...ch, title: e.target.value })} placeholder={tr("Masalan: Haftalik 30 ta topshiriq")} aria-label={tr("Nomi")} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Maqsad (ish)")}>
              <Input type="number" min={1} value={ch.targetSubmissions} onChange={(e) => setCh({ ...ch, targetSubmissions: Number(e.target.value) })} />
            </Field>
            <Field label={tr("Davomiyligi (kun)")}>
              <Input type="number" min={1} max={60} value={ch.days} onChange={(e) => setCh({ ...ch, days: Number(e.target.value) })} />
            </Field>
          </div>
          <Button
            variant="secondary"
            loading={pending}
            disabled={ch.title.trim().length < 3}
            onClick={() =>
              start(async () => {
                const r = await challengeAction(classId, ch);
                if (r.ok) {
                  toast.success(tr("Musobaqa boshlandi"));
                  setCh({ title: "", targetSubmissions: 20, days: 7 });
                  router.refresh();
                } else toast.error(r.error);
              })
            }
          >
            {tr("Boshlash")}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
