"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changePassword } from "@/app/admin/actions/auth";
import { Button, Input } from "./ui";

export function PasswordForm() {
  const [pending, start] = useTransition();
  const [values, setValues] = useState({ current: "", password: "", confirm: "" });
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <form
      className="grid max-w-md gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await changePassword(values);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(res.message);
          setValues({ current: "", password: "", confirm: "" });
        });
      }}
    >
      <div>
        <label htmlFor="pw-current" className="mb-1.5 block text-sm font-medium">
          Current password
        </label>
        <Input
          id="pw-current"
          type="password"
          autoComplete="current-password"
          value={values.current}
          onChange={set("current")}
          required
        />
      </div>
      <div>
        <label htmlFor="pw-new" className="mb-1.5 block text-sm font-medium">
          New password
        </label>
        <Input
          id="pw-new"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={set("password")}
          required
          minLength={12}
          aria-describedby="pw-help"
        />
        <p id="pw-help" className="text-subtle mt-1.5 text-xs">
          At least 12 characters with upper- and lowercase letters and a number.
        </p>
      </div>
      <div>
        <label htmlFor="pw-confirm" className="mb-1.5 block text-sm font-medium">
          Confirm new password
        </label>
        <Input
          id="pw-confirm"
          type="password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={set("confirm")}
          required
        />
      </div>
      <Button type="submit" variant="primary" loading={pending} className="justify-self-start">
        Update password
      </Button>
    </form>
  );
}
