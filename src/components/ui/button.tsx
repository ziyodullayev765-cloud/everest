import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "group relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-tight transition-all duration-300 ease-out-expo focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-black shadow-[0_8px_30px_-8px_var(--accent)] hover:brightness-110 hover:shadow-[0_10px_44px_-6px_var(--accent)] active:scale-[0.98]",
  secondary: "glass text-fg hover:border-line-strong hover:bg-white/[0.07] active:scale-[0.98]",
  ghost: "text-muted hover:text-fg hover:bg-white/[0.05]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-12 px-6 text-base sm:h-14 sm:px-7",
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
