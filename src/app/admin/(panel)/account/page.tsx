import { PasswordForm } from "@/components/admin/password-form";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

export default async function AccountAdmin() {
  const { user } = await requireAdminPage();
  return (
    <>
      <PageTitle title="Account" description="Your administrator sign-in." />
      <div className="grid gap-6">
        <Card>
          <dl className="grid gap-3 text-sm sm:grid-cols-[160px_1fr]">
            <dt className="text-subtle">Email</dt>
            <dd>{user.email}</dd>
            <dt className="text-subtle">Last sign-in</dt>
            <dd>{user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : "—"}</dd>
          </dl>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Change password</h2>
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
