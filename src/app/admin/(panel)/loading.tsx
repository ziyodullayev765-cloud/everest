export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="skeleton mt-3 h-4 w-80 max-w-full rounded-full" />
      <div className="mt-8 grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
