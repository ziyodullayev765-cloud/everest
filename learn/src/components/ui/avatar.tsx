import { cn, initials } from "@/lib/utils";

const palette = ["#0f7a5a", "#2f64c8", "#a8650c", "#6a4fc1", "#b0476b", "#1d7f8c"];

export function Avatar({ name, fileId, size = 36, className }: { name: string; fileId?: string | null; size?: number; className?: string }) {
  const color = palette[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length];
  if (fileId)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/files/${fileId}`} alt="" width={size} height={size} className={cn("shrink-0 rounded-full object-cover ring-1 ring-border", className)} style={{ width: size, height: size }} />;
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-bold text-white select-none", className)}
      style={{ width: size, height: size, background: color, fontSize: Math.max(11, size * 0.38) }}
      aria-hidden
    >
      {initials(name) || "?"}
    </span>
  );
}
