"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, BookA, ChevronRight, RotateCcw, Send, Users } from "lucide-react";
import { bulkWordListsAction } from "@/app/actions/vocab";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/tr";

type Row = { id: string; title: string; level: string; status: string; words: number; students: number; groups: { id: string; name: string }[]; authorName: string; updatedAt: Date; canEdit: boolean };
const STATUS: Record<string, { label: string; tone: "neutral" | "success" | "warning" }> = {
  draft: { get label() { return tr("Qoralama"); }, tone: "warning" },
  published: { get label() { return tr("E’lon qilingan"); }, tone: "success" },
  archived: { get label() { return tr("Arxiv"); }, tone: "neutral" },
};

/** Sets with checkboxes; selected sets can be assigned to groups, unassigned, published, archived or restored. */
export function WordListsTable({ base, rows, classes }: { base: string; rows: Row[]; classes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<string[]>([]);
  const [dialog, setDialog] = useState<null | "assign" | "unassign" | "archive">(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const all = rows.length > 0 && sel.length === rows.length;

  const apply = (op: "publish" | "draft" | "archive" | "assign" | "unassign") =>
    start(async () => {
      const r = await bulkWordListsAction({ ids: sel, op, classIds: op === "assign" || op === "unassign" ? groups : [] });
      if (!r.ok) return void toast.error(r.error);
      if (r.data.failed.length) toast.error(tr("{0} ta bajarildi, {1} ta bajarilmadi: {2}", r.data.done, r.data.failed.length, r.data.failed.map((f) => `${f.title} — ${f.error}`).join("; ")));
      else toast.success(tr("{0} ta ro‘yxat yangilandi", r.data.done));
      setDialog(null);
      setGroups([]);
      setSel([]);
      router.refresh();
    });

  return (
    <>
      <div className={cn("sticky top-[calc(env(safe-area-inset-top)+64px)] z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-border bg-surface px-3 py-2 shadow-soft lg:top-3", !sel.length && "hidden")}>
        <span className="mr-auto text-[13.5px] font-bold">{tr("{0} ta tanlandi", sel.length)}</span>
        <Button size="sm" variant="secondary" onClick={() => setDialog("assign")}><Users /> {tr("Guruhga biriktirish")}</Button>
        <Button size="sm" variant="ghost" onClick={() => setDialog("unassign")}>{tr("Guruhdan olish")}</Button>
        <Button size="sm" variant="ghost" loading={pending} onClick={() => apply("publish")}><Send /> {tr("E’lon qilish")}</Button>
        <Button size="sm" variant="ghost" loading={pending} onClick={() => apply("draft")}><RotateCcw /> {tr("Qoralamaga / tiklash")}</Button>
        <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setDialog("archive")}><Archive /> {tr("Arxivlash")}</Button>
      </div>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border bg-surface-2/50 px-5 py-2 text-[12.5px] text-muted">
          <Checkbox checked={all} onChange={(on) => setSel(on ? rows.map((r) => r.id) : [])} label={tr("Hammasini tanlash")} />
        </div>
        <ul className="divide-y divide-border">
          {rows.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50">
              <input type="checkbox" className="size-4 shrink-0 accent-[var(--primary)]" checked={sel.includes(l.id)} onChange={(e) => setSel((x) => (e.target.checked ? [...x, l.id] : x.filter((y) => y !== l.id)))} aria-label={tr("{0} — tanlash", l.title)} />
              <Link href={`${base}/vocabulary/${l.id}`} prefetch={false} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="hidden size-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info sm:grid"><BookA className="size-5" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{l.title}</span>
                    <Badge tone={STATUS[l.status]?.tone}>{STATUS[l.status]?.label}</Badge>
                    {l.level ? <Badge>{l.level}</Badge> : null}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[12.5px] text-muted">
                    <span>{tr("{0} ta so‘z", l.words)} · {l.authorName} · {formatDate(l.updatedAt)}</span>
                    {l.groups.length ? l.groups.map((g) => <span key={g.id} className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[11.5px] font-bold text-primary-soft-fg">{g.name}</span>) : null}
                    {l.students ? <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11.5px] font-bold">{tr("+{0} o‘quvchi", l.students)}</span> : null}
                    {!l.groups.length && !l.students ? <span className="rounded-md bg-warning-soft px-1.5 py-0.5 text-[11.5px] font-bold text-warning">{tr("hech kimga biriktirilmagan")}</span> : null}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Dialog
        open={dialog === "assign" || dialog === "unassign"}
        onClose={() => setDialog(null)}
        title={dialog === "assign" ? tr("Tanlangan ro‘yxatlarni guruhlarga biriktirish") : tr("Tanlangan ro‘yxatlarni guruhlardan olish")}
        description={dialog === "assign" ? tr("Mavjud biriktirishlar saqlanadi. E’lon qilingan ro‘yxatlarni o‘quvchilar darhol ko‘radi.") : tr("Bu guruh o‘quvchilari ro‘yxatni ko‘rmay qoladi; ularning natijalari saqlanadi.")}
        footer={<><Button variant="ghost" onClick={() => setDialog(null)}>{tr("Bekor qilish")}</Button><Button loading={pending} disabled={!groups.length} variant={dialog === "unassign" ? "danger" : "primary"} onClick={() => apply(dialog === "assign" ? "assign" : "unassign")}>{tr("Qo‘llash")}</Button></>}
      >
        <div className="grid gap-2">
          {classes.length ? classes.map((g) => <Checkbox key={g.id} checked={groups.includes(g.id)} onChange={(on) => setGroups((x) => (on ? [...x, g.id] : x.filter((y) => y !== g.id)))} label={g.name} />) : <p className="text-[13.5px] text-muted">{tr("Sizga hali guruh biriktirilmagan.")}</p>}
        </div>
      </Dialog>
      <Dialog
        open={dialog === "archive"}
        onClose={() => setDialog(null)}
        title={tr("{0} ta ro‘yxat arxivlansinmi?", sel.length)}
        description={tr("O‘quvchilar ularni ko‘rmay qoladi. So‘zlar va natijalar o‘chmaydi — “Arxiv” filtridan tiklash mumkin.")}
        footer={<><Button variant="ghost" onClick={() => setDialog(null)}>{tr("Yo‘q")}</Button><Button variant="danger" loading={pending} onClick={() => apply("archive")}>{tr("Ha, arxivlash")}</Button></>}
      />
    </>
  );
}
