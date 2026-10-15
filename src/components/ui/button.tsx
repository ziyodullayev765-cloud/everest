import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "group relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium uppercase tracking-[0.03em] transition-all duration-300 ease-out-expo focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "border border-accent bg-accent font-semibold text-[#0d0d0d] hover:border-[#b8956a] hover:bg-[#b8956a] active:scale-[0.98]",
  secondary: "border border-line bg-surface text-fg hover:border-line-strong hover:bg-surface-strong active:scale-[0.98]",
  ghost: "text-muted hover:text-fg hover:bg-white/[0.05]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-5 text-[0.82rem]",
  lg: "h-12 px-6 text-[0.88rem]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  external,
  ...rest
}: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode; external?: boolean } & Omit<
  ComponentProps<"a">,
  "href"
>) {
  const cls = buttonClass(variant, size, className);
  if (external || /^(https?:|mailto:|tel:)/.test(href)) {
    return (
      <a href={href} className={cls} target={/^https?:/.test(href) ? "_blank" : undefined} rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}
