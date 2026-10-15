/**
 * Quiet atmosphere behind every page: two very faint glows (surface grey and
 * bronze) plus a whisper of film grain. Static — no blur filters, no motion.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="bg-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-[10%] -left-[10%] size-[60vw] opacity-60"
        style={{ background: "radial-gradient(closest-side, var(--bg-elevated), transparent)" }}
      />
      <div
        className="absolute -right-[10%] -bottom-[20%] size-[70vw] opacity-[0.06]"
        style={{ background: "radial-gradient(closest-side, var(--accent), transparent)" }}
      />
    </div>
  );
}
