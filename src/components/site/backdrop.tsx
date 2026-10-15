/** Fixed ambient background: soft accent glows, a masked grid and film grain. Pure CSS. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-bg absolute inset-0" />
      <div className="grid-backdrop absolute inset-0" />
      <div
        className="animate-float-slow absolute -top-[20%] left-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 rounded-full opacity-[0.16] blur-[120px]"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 60%)" }}
      />
      <div
        className="absolute -right-[20%] bottom-[-30%] h-[60vmax] w-[60vmax] rounded-full opacity-[0.07] blur-[140px]"
        style={{ background: "radial-gradient(circle, #5eead4, transparent 60%)" }}
      />
      <div className="noise absolute inset-0" />
    </div>
  );
}
