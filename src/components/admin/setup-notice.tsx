export function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24">
      <div className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-6">
        <h1 className="text-xl font-semibold">Supabase is not configured</h1>
        <p className="text-muted mt-2 text-sm">
          The admin dashboard needs a Supabase project. Copy <code className="text-fg">.env.example</code> to{" "}
          <code className="text-fg">.env.local</code>, set <code className="text-fg">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-fg">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, run the SQL migration, create your admin account with{" "}
          <code className="text-fg">npm run admin:create</code>, then restart the server.
        </p>
        <p className="text-muted mt-3 text-sm">Full steps are in the README under “Setup”.</p>
      </div>
    </div>
  );
}
