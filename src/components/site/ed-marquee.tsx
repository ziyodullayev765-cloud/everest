/** Thin uppercase ticker with bronze diamonds; pauses on hover. Decorative. */
export function EdMarquee({ items }: { items: string[] }) {
  if (!items.length) return null;
  const row = [...items, ...items];
  return (
    <div className="ed-marquee" aria-hidden>
      <div className="animate-marquee flex w-max" style={{ ["--marquee-duration" as string]: "32s" }}>
        {row.map((item, i) => (
          <span key={i} className="ed-marquee-item">
            <span className="text-accent text-[0.5rem] opacity-70">◆</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
