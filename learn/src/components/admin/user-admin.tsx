import type { SessionUser } from "@/server/auth/session";
import { getUserForAdmin, studentRecord } from "@/server/services/users";
import { listClasses } from "@/server/services/classes";
import { canManageRole } from "@/server/auth/rbac";
import { orNotFound } from "@/server/auth/guards";
import { formatDate, formatDateTime } from "@/lib/dates";
import { fmtNumber } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/feedback";
import { LinkButton } from "@/components/ui/button";
import { UserEditor } from "./user-editor";
import { tr } from "@/lib/i18n/tr";

export async function UserAdminPage({ user, id, back }: { user: SessionUser; id: string; back: { href: string; label: string } }) {
  const d = await orNotFound(getUserForAdmin(user, id));
  const u = d.user;
  const [classes, record] = await Promise.all([listClasses(user), u.role === "student" ? studentRecord(user, id) : Promise.resolve(null)]);
  const editable = canManageRole(user, u.role) && u.id !== user.id;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader back={back} title={u.displayName} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        <div className="space-y-5">
          <Card>
            <CardBody className="flex flex-col items-center text-center">
              <Avatar name={u.displayName} fileId={u.avatarFileId} size={72} />
              <div className="mt-3 font-bold">{u.displayName}</div>
              <div className="text-[13px] text-muted">@{u.username}</div>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                <Badge tone="primary">{t.role[u.role]}</Badge>
                <Badge tone={u.status === "active" ? "success" : "neutral"}>{u.status === "active" ? tr("Faol") : tr("Faol emas")}</Badge>
              </div>
              <dl className="mt-4 w-full space-y-1.5 text-left text-[12.5px]">
                <div className="flex justify-between"><dt className="text-muted">{tr("Yaratilgan")}</dt><dd>{formatDate(u.createdAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">{tr("Oxirgi kirish")}</dt><dd>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</dd></div>
                {u.mustChangePassword ? <div className="text-warning">{tr("Hali vaqtinchalik parol bilan")}</div> : null}
              </dl>
            </CardBody>
          </Card>
          {u.role === "teacher" ? (
            <Card>
              <CardHeader title={tr("Faollik (30 kun)")} />
              <CardBody className="grid grid-cols-3 gap-2 pt-3 text-center">
                {[["Vazifa", d.activity.created], ["Baho", d.activity.graded], ["Izoh", d.activity.feedback]].map(([l, v]) => (
                  <div key={String(l)} className="rounded-xl bg-surface-2 py-2.5">
                    <div className="text-[18px] font-bold tabular">{v}</div>
                    <div className="text-[11.5px] text-muted">{l}</div>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}
        </div>
        <div className="min-w-0 space-y-5">
          {!editable ? <Alert tone="info">{u.id === user.id ? tr("O‘z hisobingizni Profil sahifasida boshqaring.") : tr("Bu roldagi hisobni faqat bosh administrator boshqaradi.")}</Alert> : null}
          {editable ? (
            <UserEditor
              user={{ id: u.id, role: u.role, status: u.status, username: u.username, displayName: u.displayName, email: u.email ?? "", studentCode: u.studentCode ?? "", permissions: u.permissions }}
              classes={classes.map((c) => ({ id: c.id, name: c.name }))}
              memberIds={d.classes.map((c) => c.id)}
              teaching={d.teaching.map((x) => ({ id: x.id, className: x.className, subjectName: x.subjectName }))}
            />
          ) : null}
          {record ? (
            <Card>
              <CardHeader title={tr("Akademik ma’lumot")} action={<LinkButton href={`/admin/students/${id}/record`} variant="ghost" size="sm">{tr("Batafsil")}</LinkButton>} />
              <CardBody className="pt-3">
                {record.grades.length ? (
                  <ul className="divide-y divide-border text-[13.5px]">
                    {record.grades.slice(0, 8).map((g) => (
                      <li key={g.assignment_id} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 truncate">{g.title} <span className="text-muted">· {g.subject}</span></span>
                        <span className="shrink-0 font-bold tabular">{fmtNumber(Number(g.points), 2)} / {fmtNumber(Number(g.max_points), 2)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13.5px] text-muted">{tr("Baholar yo‘q.")}</p>
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
