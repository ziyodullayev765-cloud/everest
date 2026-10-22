import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Parolni o‘zgartirish" };

export default async function ChangePasswordPage() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return (
    <div className="animate-fade-up">
      <h1 className="text-[24px] font-bold tracking-[-0.02em] text-text">{u.mustChangePassword ? "Yangi parol o‘rnating" : "Parolni o‘zgartirish"}</h1>
      <p className="mt-1.5 text-[14.5px] text-muted">
        {u.mustChangePassword ? "Hisobingiz vaqtinchalik parol bilan yaratilgan. Davom etish uchun o‘zingizning parolingizni o‘rnating." : "Boshqa qurilmalardagi seanslar yopiladi."}
      </p>
      <PasswordForm />
    </div>
  );
}
