"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookA, Plus, X } from "lucide-react";
import { bulkWordListsAction } from "@/app/actions/vocab";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { tr } from "@/lib/i18n/tr";

type Assigned = { id: string; title: string; status: string; level: string; words: number; students: number; started: number; progress: number };

/** The group's vocabulary sets: who sees what, progress, and assign / remove in place. */
export function GroupVocabCard({ classId, base, assigned, available }: { classId: string; base: string; assigned: Assigned[]; available: { id: string; title: string; status: string }[] }) {
  const router = useRouter();
  const [pick, setPick] = useState("");
  const [pending, start] = useTransition();
  const act = (listId: string, op: "assign" | "unassign") =>
    start(async () => {
      const r = await bulkWordListsAction({ ids: [listId], op, classIds: [classId] });
      if (!r.ok) return void toast.error(r.error);
      if (r.data.failed.length) return void toast.error(r.data.failed[0].error);
      toast.success(op === "assign" ? tr("Ro‘yxat guruhga biriktirildi") : tr("Ro‘yxat guruhdan olindi"));
      setPick("");
      router.refresh();
    });
  return (
    <Card className="mt-6">
      <CardHeader title={tr("Guruh lug‘ati ({0})", assigned.length)} icon={<BookA />} description={tr("Bu guruh o‘quvchilari faqat shu ro‘yxatlarni ko‘radi (va o‘zlariga alohida biriktirilganlarni).")} />
      <CardBody className="space-y-3 pt-2">
        {assigned.length ? (
          <ul className="divide-y divide-border">
            {assigned.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link href={`${base}/vocabulary/${l.id}`} className="font-bold hover:text-primary">{l.title}</Link>
                  {l.status !== "published" ? <Badge tone="warning" className="ml-2">{tr("Qoralama — o‘quvchilar ko‘rmaydi")}</Badge> : null}
                  <div className="text-[12.5px] text-muted">{tr("{0} ta so‘z · {1}/{2} o‘quvchi boshlagan · o‘rganilgan {3}%", l.words, l.started, l.students, l.progress)}</div>
                  <div className="mt-1 h-1.5 max-w-60 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-primary" style={{ width: `${l.progress}%` }} /></div>
                </div>
                <Button variant="ghost" size="icon" className="hover:text-danger" aria-label={tr("{0} — guruhdan olish", l.title)} disabled={pending} onClick={() => confirm(tr("“{0}” bu guruhdan olinsinmi? O‘quvchilar natijasi saqlanadi.", l.title)) && act(l.id, "unassign")}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] text-muted">{tr("Bu guruhga hali lug‘at biriktirilmagan.")}</p>
        )}
        {available.length ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label={tr("Biriktiriladigan ro‘yxat")}>
              <option value="">{tr("Ro‘yxatni tanlang…")}</option>
              {available.map((l) => <option key={l.id} value={l.id}>{l.title}{l.status === "draft" ? ` · ${tr("Qoralama")}` : ""}</option>)}
            </Select>
            <Button disabled={!pick} loading={pending} onClick={() => act(pick, "assign")}><Plus /> {tr("Biriktirish")}</Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
