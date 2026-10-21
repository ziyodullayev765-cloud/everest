"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Plus, Power, Save, X } from "lucide-react";
import { assignTeacherAction, membershipsAction, resetLinkAction, unassignTeacherAction, updateUserAction, userStatusAction } from "@/app/actions/admin";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Checkbox } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

const PERMS: [string, string][] = [
  ["assignments.create", "Vazifa va quiz yaratish"],
  ["grades.edit_final", "Yakuniy baholarni o‘zgartirish"],
  ["reports.export", "Hisobotlarni eksport qilish"],
  ["classes.all", "Barcha sinflarga kirish (ehtiyotkorlik bilan)"],
];

type U = { id: string; role: string; status: string; username: string; displayName: string; email: string; studentCode: string; permissions: string[] };

export function UserEditor({ user, classes, subjects, memberIds, teaching }: { user: U; classes: { id: string; name: string }[]; subjects: { id: string; name: string }[]; memberIds: string[]; teaching: { id: string; className: string; subjectName: string | null }[] }) {
  const [f, setF] = useState(user);
  const [members, setMembers] = useState(memberIds);
  const [assign, setAssign] = useState({ classId: classes[0]?.id ?? "", subjectId: "" });
  const [link, setLink] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) {
        toast.success(msg);
        router.refresh();
      } else setError(r.error ?? "Xatolik");
    });

  return (
    <>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Card>
        <CardHeader title="Ma’lumotlar" />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="To‘liq ism"><Input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} /></Field>
            <Field label="Login"><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} /></Field>
            <Field label="E-pochta"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            {f.role === "student" ? <Field label="O‘quvchi ID"><Input value={f.studentCode} onChange={(e) => setF({ ...f, studentCode: e.target.value })} /></Field> : null}
          </div>
          {f.role === "teacher" ? (
            <Field label="Ruxsatlar">
              <div className="space-y-1.5">
                {PERMS.map(([k, l]) => (
                  <Checkbox key={k} checked={f.permissions.includes(k)} onChange={(x) => setF({ ...f, permissions: x ? [...f.permissions, k] : f.permissions.filter((y) => y !== k) })} label={l} />
                ))}
              </div>
            </Field>
          ) : null}
          <Button loading={pending} onClick={() => run(() => updateUserAction(f.id, { username: f.username, displayName: f.displayName, email: f.email, studentCode: f.studentCode, permissions: f.permissions }), "Saqlandi")}>
            <Save /> Saqlash
          </Button>
        </CardBody>
      </Card>

      {f.role === "student" ? (
        <Card>
          <CardHeader title="Sinflar" description="Sinfdan chiqarish baholar va topshirilgan ishlarni o‘chirmaydi." />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <Checkbox key={c.id} className="rounded-lg border border-border px-2.5 py-1.5" checked={members.includes(c.id)} onChange={(x) => setMembers(x ? [...members, c.id] : members.filter((y) => y !== c.id))} label={c.name} />
              ))}
            </div>
            <Button variant="secondary" loading={pending} onClick={() => run(() => membershipsAction(f.id, members), "Sinflar yangilandi")}>
              Sinflarni saqlash
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {f.role === "teacher" ? (
        <Card>
          <CardHeader title="Sinf va fanlar" description="O‘qituvchi faqat shu yerda ko‘rsatilgan sinflarni ko‘radi." />
          <CardBody className="space-y-4">
            <ul className="space-y-2">
              {teaching.map((x) => (
                <li key={x.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-[13.5px]">
                  <span><b className="font-medium">{x.className}</b> · {x.subjectName ?? "barcha fanlar"}</span>
                  <Button variant="ghost" size="icon" aria-label="Ajratish" onClick={() => run(() => unassignTeacherAction(x.id), "Ajratildi")}>
                    <X />
                  </Button>
                </li>
              ))}
              {!teaching.length ? <li className="text-[13px] text-muted">Hali biriktirilmagan.</li> : null}
            </ul>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Select value={assign.classId} onChange={(e) => setAssign({ ...assign, classId: e.target.value })} aria-label="Sinf">
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select value={assign.subjectId} onChange={(e) => setAssign({ ...assign, subjectId: e.target.value })} aria-label="Fan">
                <option value="">Barcha fanlar</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <Button variant="secondary" disabled={!assign.classId} onClick={() => run(() => assignTeacherAction(assign.classId, f.id, assign.subjectId || null), "Biriktirildi")}>
                <Plus /> Biriktirish
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Kirish va xavfsizlik" />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await resetLinkAction(f.id);
                  if (r.ok) setLink(r.data);
                  else setError(r.error);
                })
              }
            >
              <KeyRound /> Parol tiklash havolasi
            </Button>
            <Button variant={f.status === "active" ? "danger" : "secondary"} onClick={() => setConfirm(true)}>
              <Power /> {f.status === "active" ? "Faolsizlantirish" : "Qayta faollashtirish"}
            </Button>
          </div>
          {link ? (
            <Alert tone="warning" title="Bir martalik havola (24 soat)">
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-2 py-1 text-[12px]">{link}</code>
                <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Nusxalandi"))}>
                  <Copy />
                </Button>
              </div>
              <p className="mt-1 text-[12px]">Havolani faqat hisob egasiga shaxsan bering. Eski havolalar bekor qilindi.</p>
            </Alert>
          ) : null}
        </CardBody>
      </Card>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={f.status === "active" ? "Hisobni faolsizlantirasizmi?" : "Hisobni qayta faollashtirasizmi?"}
        description={f.status === "active" ? "Foydalanuvchi tizimdan chiqariladi va kira olmaydi. Topshirilgan ishlar va baholar saqlanadi." : "Foydalanuvchi yana tizimga kira oladi."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>Bekor qilish</Button>
            <Button
              variant={f.status === "active" ? "danger" : "primary"}
              loading={pending}
              onClick={() => {
                const next = f.status === "active" ? "deactivated" : "active";
                setConfirm(false);
                run(async () => {
                  const r = await userStatusAction(f.id, next as "active");
                  if (r.ok) setF({ ...f, status: next });
                  return r;
                }, next === "active" ? "Faollashtirildi" : "Faolsizlantirildi");
              }}
            >
              Tasdiqlash
            </Button>
          </>
        }
      />
    </>
  );
}
