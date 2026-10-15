/**
 * Colourful background: three soft colour fields (violet / pink / cyan) drawn
 * with plain radial gradients. Static on purpose — a fixed full-screen layer
 * that animates forces the whole page to recomposite every frame.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="bg-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-[30%] -left-[20%] h-[80vmax] w-[80vmax] opacity-50"
        style={{ background: "radial-gradient(closest-side, var(--accent), transparent)" }}
      />
      <div
        className="absolute top-[15%] -right-[25%] h-[70vmax] w-[70vmax] opacity-35"
        style={{ background: "radial-gradient(closest-side, var(--c-pink), transparent)" }}
      />
      <div
        className="absolute -bottom-[35%] left-[15%] h-[65vmax] w-[65vmax] opacity-30"
        style={{ background: "radial-gradient(closest-side, var(--c-cyan), transparent)" }}
      />
    </div>
  );
}
