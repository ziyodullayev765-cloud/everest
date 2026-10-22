import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

/** "Pressable" buttons: a solid bottom edge that collapses on press. */
const press = "active:translate-y-[2px]";
const variants: Record<Variant, string> = {
  primary: `bg-primary text-primary-fg hover:bg-primary-hover shadow-[0_3px_0_0_var(--primary-shadow)] active:shadow-[0_1px_0_0_var(--primary-shadow)] ${press}`,
  secondary: `bg-surface text-text border-2 border-border hover:bg-surface-2 shadow-[0_3px_0_0_var(--border)] active:shadow-[0_1px_0_0_var(--border)] ${press}`,
  outline: "border-2 border-border-strong text-text hover:bg-surface-2",
  ghost: "text-text-2 hover:bg-surface-2 hover:text-text",
  soft: "bg-primary-soft text-primary-soft-fg hover:brightness-[0.97]",
  danger: `bg-danger text-white hover:brightness-110 shadow-[0_3px_0_0_var(--danger-shadow)] active:shadow-[0_1px_0_0_var(--danger-shadow)] ${press}`,
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-xl",
  md: "h-11 px-4 text-[14.5px] gap-2 rounded-2xl",
  lg: "h-[52px] px-6 text-[16px] gap-2 rounded-2xl tracking-[0.01em]",
  icon: "h-10 w-10 rounded-xl",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(
    "inline-flex shrink-0 items-center justify-center font-extrabold whitespace-nowrap transition-[background,color,border,box-shadow,transform] duration-100 select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant, size, loading, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function LinkButton({ variant, size, className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
