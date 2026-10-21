"use client";
import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null);
  const f = state && !state.ok ? state.fields ?? {} : {};
  return (
    <form action={action} className="mt-8 space-y-4">
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label="Joriy (vaqtinchalik) parol" htmlFor="current" error={f.current}>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Yangi parol" htmlFor="next" hint="Kamida 8 belgi, harf va raqam" error={f.next}>
        <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Yangi parolni takrorlang" htmlFor="confirm" error={f.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Saqlash va davom etish
      </Button>
    </form>
  );
}
