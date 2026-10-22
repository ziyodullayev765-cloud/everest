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
import { tr } from "@/lib/i18n/tr";

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
      <Alert tone="warning" title={tr("Vaqtinchalik parollar faqat hozir ko‘rsatiladi")}>
        {tr("Ularni xavfsiz tarzda topshiring. Birinchi kirishda foydalanuvchi o‘z parolini o‘rnatadi.")}
      </Alert>
      <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.username}>
                <td className="px-3 py-2">{r.displayName}</td>
                <td className="px-3 py-2 font-mono">{r.username}</td>
                <td className="px-3 py-2 font-mono font-bold">{r.tempPassword}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => download("hisoblar.csv", toCsv([["Ism", "Login", tr("Vaqtinchalik parol")], ...rows.map((r) => [r.displayName, r.username, r.tempPassword])]))}>
          <Download /> {tr("CSV yuklab olish")}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(rows.map((r) => `${r.displayName}\t${r.username}\t${r.tempPassword}`).join("\n")).then(() => toast.success(tr("Nusxalandi")))}>
          <Copy /> {tr("Nusxalash")}
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
          <Upload /> {tr("CSV import")}
        </Button>
      ) : null}
      <Button onClick={() => setOpen("create")}>
        <Plus /> {kind === "student" ? tr("O‘quvchi qo‘shish") : tr("Xodim qo‘shish")}
      </Button>

      <Dialog open={open === "create"} onClose={close} title={kind === "student" ? tr("Yangi o‘quvchi") : tr("Yangi xodim")} description={tr("Vaqtinchalik parol avtomatik yaratiladi.")}>
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
              <Field label={tr("Rol")}>
                <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                  <option value="teacher">{tr("O‘qituvchi")}</option>
                  {canCreateAdmins ? <option value="admin">{tr("Administrator")}</option> : null}
                  {canCreateAdmins ? <option value="super_admin">{tr("Bosh administrator")}</option> : null}
                </Select>
              </Field>
            ) : null}
            <Field label={tr("To‘liq ism")} required error={errors.displayName}>
              <Input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} required />
            </Field>
            <Field label={tr("Login")} required hint={tr("Lotin harflari, raqam, nuqta")} error={errors.username}>
              <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} autoCapitalize="none" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr("E-pochta (ixtiyoriy)")} error={errors.email} hint={kind === "student" ? tr("Voyaga yetmaganlar uchun shart emas") : undefined}>
                <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              </Field>
              {kind === "student" ? (
                <Field label={tr("O‘quvchi ID (ixtiyoriy)")} error={errors.studentCode}>
                  <Input value={f.studentCode} onChange={(e) => setF({ ...f, studentCode: e.target.value })} />
                </Field>
              ) : null}
            </div>
            {f.role === "student" || f.role === "teacher" ? (
              <Field label={f.role === "student" ? tr("Guruhlar") : tr("Biriktiriladigan guruhlar")}>
                <div className="flex flex-wrap gap-2">
                  {classes.map((c) => (
                    <Checkbox key={c.id} className="rounded-lg border border-border px-2.5 py-1.5" checked={f.classIds.includes(c.id)} onChange={(x) => setF({ ...f, classIds: x ? [...f.classIds, c.id] : f.classIds.filter((y) => y !== c.id) })} label={c.name} />
                  ))}
                </div>
              </Field>
            ) : null}
            {f.role === "teacher" ? (
              <Field label={tr("Ruxsatlar")}>
                <div className="space-y-1.5">
                  {PERMS.map(([k, l]) => (
                    <Checkbox key={k} checked={f.permissions.includes(k)} onChange={(x) => setF({ ...f, permissions: x ? [...f.permissions, k] : f.permissions.filter((y) => y !== k) })} label={tr(l)} />
                  ))}
                </div>
              </Field>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={close}>
                {tr("Bekor qilish")}
              </Button>
              <Button type="submit" loading={pending}>
                {tr("Yaratish")}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <Dialog open={open === "import"} onClose={close} title={tr("O‘quvchilarni CSV dan import qilish")} description={tr("Sarlavha: username,display_name,class,student_code,email (class — guruh nomi yoki kodi). Barcha qatorlar to‘g‘ri bo‘lsagina import qilinadi.")}>
        {created ? (
          <Credentials rows={created} />
        ) : (
          <div className="space-y-4">
            <input
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-[13px] file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-semibold file:text-primary-soft-fg"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setCsv(await file.text());
              }}
            />
            <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} className="w-full rounded-xl border border-border bg-surface p-3 font-mono text-base sm:text-[12.5px]" placeholder={tr("username,display_name,class,student_code\nali.v,Ali Valiyev,7-A,S-1001")} aria-label={tr("CSV matni")} />
            {importErrors.length ? (
              <Alert tone="danger" title={tr("{0} ta xato — hech narsa import qilinmadi", importErrors.length)}>
                <ul className="mt-1 max-h-36 overflow-y-auto">
                  {importErrors.map((x, i) => (
                    <li key={i}>{tr("{0}-qator: {1}", x.line, x.message)}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>
                {tr("Bekor qilish")}
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
                    toast.success(tr("{0} ta o‘quvchi qo‘shildi", r.data.created.length));
                    router.refresh();
                  })
                }
              >
                {tr("Import qilish")}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
