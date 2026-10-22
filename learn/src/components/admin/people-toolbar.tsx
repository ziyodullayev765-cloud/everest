"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Plus, Upload } from "lucide-react";
import { createUserAction, importStudentsAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Checkbox } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";
import { toCsv } from "@/lib/utils";

const PERMS: [string, string][] = [
  ["assignments.create", "Vazifa va quiz yaratish"],
  ["grades.edit_final", "Yakuniy baholarni o‘zgartirish"],
  ["reports.export", "Hisobotlarni eksport qilish"],
  ["classes.all", "Barcha guruhlarga kirish"],
];

function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function Credentials({ rows }: { rows: { username: string; displayName: string; tempPassword: string }[] }) {
  return (
    <div className="space-y-3">
      <Alert tone="warning" title="Vaqtinchalik parollar faqat hozir ko‘rsatiladi">
        Ularni xavfsiz tarzda topshiring. Birinchi kirishda foydalanuvchi o‘z parolini o‘rnatadi.
      </Alert>
      <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.username}>
                <td className="px-3 py-2">{r.displayName}</td>
                <td className="px-3 py-2 font-mono">{r.username}</td>
                <td className="px-3 py-2 font-mono font-semibold">{r.tempPassword}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => download("hisoblar.csv", toCsv([["Ism", "Login", "Vaqtinchalik parol"], ...rows.map((r) => [r.displayName, r.username, r.tempPassword])]))}>
          <Download /> CSV yuklab olish
        </Button>
        <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(rows.map((r) => `${r.displayName}\t${r.username}\t${r.tempPassword}`).join("\n")).then(() => toast.success("Nusxalandi"))}>
          <Copy /> Nusxalash
        </Button>
      </div>
    </div>
  );
}

export function PeopleToolbar({ kind, classes, canCreateAdmins }: { kind: "student" | "staff"; classes: { id: string; name: string }[]; canCreateAdmins: boolean }) {
  const [open, setOpen] = useState<"create" | "import" | null>(null);
  const [f, setF] = useState({ role: kind === "student" ? "student" : "teacher", username: "", displayName: "", email: "", studentCode: "", classIds: [] as string[], permissions: ["assignments.create"] as string[] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ username: string; displayName: string; tempPassword: string }[] | null>(null);
  const [csv, setCsv] = useState("");
  const [importErrors, setImportErrors] = useState<{ line: number; message: string }[]>([]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const close = () => {
    setOpen(null);
    setCreated(null);
    setErrors({});
    setError(null);
    setImportErrors([]);
  };
  return (
    <>
      {kind === "student" ? (
        <Button variant="secondary" onClick={() => setOpen("import")}>
          <Upload /> CSV import
        </Button>
      ) : null}
      <Button onClick={() => setOpen("create")}>
        <Plus /> {kind === "student" ? "O‘quvchi qo‘shish" : "Xodim qo‘shish"}
      </Button>

      <Dialog open={open === "create"} onClose={close} title={kind === "student" ? "Yangi o‘quvchi" : "Yangi xodim"} description="Vaqtinchalik parol avtomatik yaratiladi.">
        {created ? (
          <Credentials rows={created} />
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                setErrors({});
                setError(null);
                const r = await createUserAction({ ...f, permissions: f.role === "teacher" ? f.permissions : [] });
                if (r.ok) {
                  setCreated([{ username: f.username.toLowerCase(), displayName: f.displayName, tempPassword: r.data.tempPassword }]);
                  setF({ ...f, username: "", displayName: "", email: "", studentCode: "" });
                  router.refresh();
                } else {
                  setErrors(r.fields ?? {});
                  setError(r.error);
                }
              });
            }}
          >
            {error ? <Alert tone="danger">{error}</Alert> : null}
            {kind === "staff" ? (
              <Field label="Rol">
                <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                  <option value="teacher">O‘qituvchi</option>
                  {canCreateAdmins ? <option value="admin">Administrator</option> : null}
                  {canCreateAdmins ? <option value="super_admin">Bosh administrator</option> : null}
                </Select>
              </Field>
            ) : null}
            <Field label="To‘liq ism" required error={errors.displayName}>
              <Input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} required />
            </Field>
            <Field label="Login" required hint="Lotin harflari, raqam, nuqta" error={errors.username}>
              <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} autoCapitalize="none" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-pochta (ixtiyoriy)" error={errors.email} hint={kind === "student" ? "Voyaga yetmaganlar uchun shart emas" : undefined}>
                <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              </Field>
              {kind === "student" ? (
                <Field label="O‘quvchi ID (ixtiyoriy)" error={errors.studentCode}>
                  <Input value={f.studentCode} onChange={(e) => setF({ ...f, studentCode: e.target.value })} />
                </Field>
              ) : null}
            </div>
            {f.role === "student" || f.role === "teacher" ? (
              <Field label={f.role === "student" ? "Guruhlar" : "Biriktiriladigan guruhlar"}>
                <div className="flex flex-wrap gap-2">
                  {classes.map((c) => (
                    <Checkbox key={c.id} className="rounded-lg border border-border px-2.5 py-1.5" checked={f.classIds.includes(c.id)} onChange={(x) => setF({ ...f, classIds: x ? [...f.classIds, c.id] : f.classIds.filter((y) => y !== c.id) })} label={c.name} />
                  ))}
                </div>
              </Field>
            ) : null}
            {f.role === "teacher" ? (
              <Field label="Ruxsatlar">
                <div className="space-y-1.5">
                  {PERMS.map(([k, l]) => (
                    <Checkbox key={k} checked={f.permissions.includes(k)} onChange={(x) => setF({ ...f, permissions: x ? [...f.permissions, k] : f.permissions.filter((y) => y !== k) })} label={l} />
                  ))}
                </div>
              </Field>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={close}>
                Bekor qilish
              </Button>
              <Button type="submit" loading={pending}>
                Yaratish
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <Dialog open={open === "import"} onClose={close} title="O‘quvchilarni CSV dan import qilish" description="Sarlavha: username,display_name,class,student_code,email (class — guruh nomi yoki kodi). Barcha qatorlar to‘g‘ri bo‘lsagina import qilinadi.">
        {created ? (
          <Credentials rows={created} />
        ) : (
          <div className="space-y-4">
            <input
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-[13px] file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-medium file:text-primary-soft-fg"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setCsv(await file.text());
              }}
            />
            <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} className="w-full rounded-xl border border-border bg-surface p-3 font-mono text-base sm:text-[12.5px]" placeholder={"username,display_name,class,student_code\nali.v,Ali Valiyev,7-A,S-1001"} aria-label="CSV matni" />
            {importErrors.length ? (
              <Alert tone="danger" title={`${importErrors.length} ta xato — hech narsa import qilinmadi`}>
                <ul className="mt-1 max-h-36 overflow-y-auto">
                  {importErrors.map((x, i) => (
                    <li key={i}>{x.line}-qator: {x.message}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                Bekor qilish
              </Button>
              <Button
                loading={pending}
                disabled={!csv.trim()}
                onClick={() =>
                  start(async () => {
                    setError(null);
                    const r = await importStudentsAction(csv);
                    if (!r.ok) return setError(r.error);
                    if (r.data.errors.length) return setImportErrors(r.data.errors);
                    setImportErrors([]);
                    setCreated(r.data.created);
                    toast.success(`${r.data.created.length} ta o‘quvchi qo‘shildi`);
                    router.refresh();
                  })
                }
              >
                Import qilish
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
