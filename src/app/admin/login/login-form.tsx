"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { signIn } from "@/app/admin/actions/auth";
import { Input } from "@/components/admin/ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="grid gap-4" noValidate={false}>
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className="text-muted mb-1.5 block text-sm">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div>
        <label htmlFor="password" className="text-muted mb-1.5 block text-sm">
          Password
        </label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state && !state.ok && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="bg-accent mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl font-medium text-black transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
        Sign in
      </button>
    </form>
  );
}
