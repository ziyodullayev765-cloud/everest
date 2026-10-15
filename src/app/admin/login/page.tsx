import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { Backdrop } from "@/components/site/backdrop";
import { SetupNotice } from "@/components/admin/setup-notice";
import { getAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  if (await getAdmin()) redirect("/admin");
  const { next } = await searchParams;

  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <Backdrop />
      <div className="glass w-full max-w-sm rounded-3xl p-7 sm:p-8">
        <div className="mb-7">
          <span className="bg-accent grid size-10 place-items-center rounded-xl text-sm font-bold text-black">SZ</span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="text-muted mt-1 text-sm">Manage your portfolio content.</p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
