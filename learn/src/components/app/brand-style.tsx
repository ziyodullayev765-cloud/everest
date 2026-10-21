/** Applies the admin-chosen accent colour (light mode). Dark mode keeps its tuned palette for contrast. */
export function BrandStyle({ color }: { color: string }) {
  if (!/^#[0-9a-fA-F]{6}$/.test(color) || color.toLowerCase() === "#0f7a5a") return null;
  const css = `:root:not(.dark){--primary:${color};--primary-hover:color-mix(in oklab, ${color} 88%, black);--primary-soft:color-mix(in oklab, ${color} 11%, white);--primary-soft-fg:color-mix(in oklab, ${color} 80%, black);--ring:color-mix(in oklab, ${color} 35%, transparent);--chart-1:${color}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
