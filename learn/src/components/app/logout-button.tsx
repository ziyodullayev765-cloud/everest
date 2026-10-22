"use client";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { clearSavedFiles } from "@/lib/offline";

export function LogoutButton() {
  return (
    <form action={logoutAction} onSubmit={clearSavedFiles}>
      <button type="submit" className="flex w-full items-center gap-3 rounded-3xl border-2 border-border bg-surface px-4 py-3.5 text-left text-[14.5px] font-bold text-danger hover:bg-danger/5">
        <span className="grid size-9 place-items-center rounded-xl bg-danger/10">
          <LogOut className="size-[18px]" aria-hidden />
        </span>
        Chiqish
      </button>
    </form>
  );
}
