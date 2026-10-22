"use client";
import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { tr } from "@/lib/i18n/tr";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null);
  const f = state && !state.ok ? state.fields ?? {} : {};
  return (
    <form action={action} className="mt-8 space-y-4">
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label={tr("Joriy (vaqtinchalik) parol")} htmlFor="current" error={f.current}>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label={tr("Yangi parol")} htmlFor="next" hint={tr("Kamida 8 belgi, harf va raqam")} error={f.next}>
        <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label={tr("Yangi parolni takrorlang")} htmlFor="confirm" error={f.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {tr("Saqlash va davom etish")}
      </Button>
    </form>
  );
}
