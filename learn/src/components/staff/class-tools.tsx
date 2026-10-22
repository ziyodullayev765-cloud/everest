"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Target } from "lucide-react";
import { announceAction, challengeAction } from "@/app/actions/staff";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function ClassTools({ classId }: { classId: string }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ch, setCh] = useState({ title: "", targetSubmissions: 20, days: 7 });
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader title="E’lon yuborish" icon={<Megaphone />} description="Guruhdagi barcha o‘quvchilarga bildirishnoma" />
        <CardBody className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sarlavha" aria-label="Sarlavha" maxLength={120} />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Matn…" aria-label="Matn" maxLength={5000} />
          <Button
            loading={pending}
            disabled={title.trim().length < 2 || body.trim().length < 2}
            onClick={() =>
              start(async () => {
                const r = await announceAction(classId, { title, body });
                if (r.ok) {
                  toast.success("E’lon yuborildi");
                  setTitle("");
                  setBody("");
                  router.refresh();
                } else toast.error(r.error);
              })
            }
          >
            Yuborish
          </Button>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Guruh musobaqasi" icon={<Target />} description="Umumiy maqsad: guruh birgalikda nechta ish topshiradi" />
        <CardBody className="space-y-3">
          <Input value={ch.title} onChange={(e) => setCh({ ...ch, title: e.target.value })} placeholder="Masalan: Haftalik 30 ta topshiriq" aria-label="Nomi" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Maqsad (ish)">
              <Input type="number" min={1} value={ch.targetSubmissions} onChange={(e) => setCh({ ...ch, targetSubmissions: Number(e.target.value) })} />
            </Field>
            <Field label="Davomiyligi (kun)">
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
                  toast.success("Musobaqa boshlandi");
                  setCh({ title: "", targetSubmissions: 20, days: 7 });
                  router.refresh();
                } else toast.error(r.error);
              })
            }
          >
            Boshlash
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
