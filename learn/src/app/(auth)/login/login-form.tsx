"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state && !state.ok ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label="Login" htmlFor="username">
        <Input id="username" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required placeholder="masalan, ali.valiyev" autoFocus />
      </Field>
      <Field label="Parol" htmlFor="password">
        <div className="relative">
          <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="pr-11" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text" aria-label={show ? "Parolni yashirish" : "Parolni ko‘rsatish"}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Kirish
      </Button>
    </form>
  );
}
