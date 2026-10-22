"use client";
import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { tr } from "@/lib/i18n/tr";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  const f = state && !state.ok ? state.fields ?? {} : {};
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label={tr("Yangi parol")} htmlFor="password" hint={tr("Kamida 8 belgi, harf va raqam")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label={tr("Takrorlang")} htmlFor="confirm" error={f.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {tr("Parolni saqlash")}
      </Button>
    </form>
  );
}
