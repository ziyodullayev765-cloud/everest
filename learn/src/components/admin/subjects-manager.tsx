"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Plus, RotateCcw, Save } from "lucide-react";
import { archiveSubjectAction, createSubjectAction, updateSubjectAction } from "@/app/actions/admin";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";

type S = { id: string; name: string; code: string; color: string; archived: boolean };

export function SubjectsManager({ rows }: { rows: S[] }) {
  const [items, setItems] = useState(rows);
  const [n, setN] = useState({ name: "", code: "", color: "#0f7a5a" });
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(msg);
        after?.();
        router.refresh();
      } else toast.error(r.error ?? "Xatolik");
    });
  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <form className="grid gap-2 sm:grid-cols-[1fr_120px_56px_auto]" onSubmit={(e) => { e.preventDefault(); run(() => createSubjectAction(n), "Fan qo‘shildi", () => setN({ name: "", code: "", color: "#0f7a5a" })); }}>
            <Input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} placeholder="Fan nomi" aria-label="Fan nomi" />
            <Input value={n.code} onChange={(e) => setN({ ...n, code: e.target.value.toUpperCase() })} placeholder="KOD" aria-label="Kod" />
            <input type="color" value={n.color} onChange={(e) => setN({ ...n, color: e.target.value })} className="h-10 w-full cursor-pointer rounded-xl border border-border bg-surface" aria-label="Rang" />
            <Button type="submit" loading={pending}><Plus /> Qo‘shish</Button>
          </form>
        </CardBody>
      </Card>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {items.map((s, i) => (
            <li key={s.id} className="grid items-center gap-2 px-5 py-3 sm:grid-cols-[1fr_110px_48px_auto_auto]">
              <Input value={s.name} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label="Nomi" disabled={s.archived} />
              <Input value={s.code} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, code: e.target.value.toUpperCase() } : x)))} aria-label="Kod" disabled={s.archived} />
              <input type="color" value={s.color} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} className="h-10 w-full rounded-xl border border-border" aria-label="Rang" disabled={s.archived} />
              {s.archived ? <Badge>Arxiv</Badge> : <Button variant="secondary" size="sm" onClick={() => run(() => updateSubjectAction(s.id, s), "Saqlandi")}><Save /> Saqlash</Button>}
              <Button variant="ghost" size="sm" onClick={() => run(() => archiveSubjectAction(s.id, !s.archived), s.archived ? "Tiklandi" : "Arxivlandi")}>{s.archived ? <><RotateCcw /> Tiklash</> : <><Archive /> Arxiv</>}</Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
