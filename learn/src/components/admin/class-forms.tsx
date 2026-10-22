"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, KeyRound, Plus, RotateCcw, Search, UserMinus, UserPlus, X } from "lucide-react";
import { archiveClassAction, assignTeacherAction, createClassAction, enrollAction, joinCodeAction, unassignTeacherAction, updateClassAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Checkbox, Textarea } from "@/components/ui/form";
import { LEVELS } from "@/lib/course";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";

function useRun() {
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
  return { pending, run };
}

export function ClassForm({ cls }: { cls?: { id: string; name: string; level: string; description: string } }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: cls?.name ?? "", level: cls?.level ?? "", description: cls?.description ?? "" });
  const { pending, run } = useRun();
  return (
    <>
      <Button variant={cls ? "secondary" : "primary"} size={cls ? "sm" : "md"} onClick={() => setOpen(true)}>
        {cls ? "Tahrirlash" : <><Plus /> Yangi guruh</>}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={cls ? "Guruhni tahrirlash" : "Yangi guruh"}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => (cls ? updateClassAction(cls.id, f) : createClassAction(f)), "Saqlandi", () => setOpen(false));
          }}
        >
          <Field label="Nomi" required><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Intermediate 1" required /></Field>
          <Field label="Daraja" hint="Kurs darajasi — rasmiy CEFR sertifikati emas.">
            <Input value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} list="group-levels" placeholder="Intermediate (B1)" />
          </Field>
          <datalist id="group-levels">{LEVELS.map((l) => <option key={l} value={l} />)}</datalist>
          <Field label="Izoh"><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Dars kunlari, maqsad (masalan, IELTS 6.5)" /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button type="submit" loading={pending}>Saqlash</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

type Student = { id: string; displayName: string; className: string };

export function ClassManager({ cls, students, teachers, allStudents, allTeachers }: { cls: { id: string; name: string; level: string; description: string; joinCode: string | null; archivedAt: Date | null }; students: { id: string; displayName: string; username: string; status: string }[]; teachers: { id: string; displayName: string }[]; allStudents: Student[]; allTeachers: { id: string; displayName: string }[] }) {
  const { pending, run } = useRun();
  const [addOpen, setAddOpen] = useState(false);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [t, setT] = useState({ teacherId: allTeachers[0]?.id ?? "" });
  const candidates = useMemo(() => {
    const inClass = new Set(students.map((s) => s.id));
    return allStudents.filter((s) => !inClass.has(s.id) && (!q || s.displayName.toLowerCase().includes(q.toLowerCase()))).slice(0, 100);
  }, [allStudents, q, students]);
  return (
    <div className="space-y-5">
      {cls.archivedAt ? <Alert tone="warning">Guruh arxivlangan. O‘qituvchilar va o‘quvchilar uni faol ro‘yxatda ko‘rmaydi, tarix saqlanadi.</Alert> : null}
      <Card>
        <CardHeader title="Sozlamalar" action={<ClassForm cls={cls} />} />
        <CardBody className="flex flex-wrap items-center gap-3 pt-3">
          {cls.joinCode ? (
            <>
              <span className="text-[13px] text-muted">Qo‘shilish kodi:</span>
              <code className="rounded-lg bg-surface-2 px-3 py-1.5 text-[15px] font-bold tracking-[0.2em]">{cls.joinCode}</code>
              <Button variant="ghost" size="sm" loading={pending} onClick={() => run(() => joinCodeAction(cls.id, true), "Yangi kod yaratildi")}><RotateCcw /> Yangilash</Button>
              <Button variant="ghost" size="sm" loading={pending} onClick={() => run(() => joinCodeAction(cls.id, false), "Kod o‘chirildi")}><X /> O‘chirish</Button>
            </>
          ) : !cls.archivedAt ? (
            <Button variant="secondary" size="sm" loading={pending} onClick={() => run(() => joinCodeAction(cls.id, true), "Kod yaratildi")}><KeyRound /> Qo‘shilish kodi yaratish</Button>
          ) : null}
          <span className="flex-1" />
          <Button variant={cls.archivedAt ? "secondary" : "ghost"} size="sm" loading={pending} onClick={() => run(() => archiveClassAction(cls.id, !cls.archivedAt), cls.archivedAt ? "Tiklandi" : "Arxivlandi")}>
            {cls.archivedAt ? <><RotateCcw /> Tiklash</> : <><Archive /> Arxivlash</>}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`O‘qituvchilar (${teachers.length})`} />
        <CardBody className="space-y-3 pt-3">
          <ul className="space-y-2">
            {teachers.map((x) => (
              <li key={x.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-[13.5px]">
                <span className="font-semibold">{x.displayName}</span>
                <Button variant="ghost" size="icon" aria-label="Ajratish" onClick={() => run(() => unassignTeacherAction(x.id), "Ajratildi")}><X /></Button>
              </li>
            ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Select value={t.teacherId} onChange={(e) => setT({ ...t, teacherId: e.target.value })} aria-label="O‘qituvchi">
              {allTeachers.map((x) => <option key={x.id} value={x.id}>{x.displayName}</option>)}
            </Select>
            <Button variant="secondary" disabled={!t.teacherId} onClick={() => run(() => assignTeacherAction(cls.id, t.teacherId), "Biriktirildi")}><Plus /> Biriktirish</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`O‘quvchilar (${students.length})`} action={<Button size="sm" onClick={() => setAddOpen(true)}><UserPlus /> Qo‘shish</Button>} />
        <CardBody className="pt-2">
          <ul className="divide-y divide-border">
            {students.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-[13.5px]">
                <a href={`/admin/students/${s.id}`} className="min-w-0 truncate font-semibold hover:text-primary">{s.displayName} <span className="font-normal text-muted">@{s.username}</span></a>
                <Button variant="ghost" size="sm" onClick={() => run(() => enrollAction(cls.id, [s.id], false), "Guruhdan chiqarildi")}><UserMinus /> Chiqarish</Button>
              </li>
            ))}
            {!students.length ? <li className="py-4 text-center text-[13px] text-muted">O‘quvchi yo‘q.</li> : null}
          </ul>
        </CardBody>
      </Card>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="O‘quvchilarni qo‘shish"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Bekor qilish</Button>
            <Button disabled={!picked.length} loading={pending} onClick={() => run(() => enrollAction(cls.id, picked, true), `${picked.length} ta o‘quvchi qo‘shildi`, () => { setAddOpen(false); setPicked([]); })}>Qo‘shish ({picked.length})</Button>
          </>
        }
      >
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish" className="pl-9" />
        </div>
        <div className="max-h-[45dvh] space-y-1 overflow-y-auto">
          {candidates.map((s) => (
            <Checkbox key={s.id} className="rounded-lg px-2 py-1.5 hover:bg-surface-2" checked={picked.includes(s.id)} onChange={(c) => setPicked(c ? [...picked, s.id] : picked.filter((x) => x !== s.id))} label={<>{s.displayName} <span className="text-muted">· {s.className || "guruhsiz"}</span></>} />
          ))}
        </div>
      </Dialog>
    </div>
  );
}
