"use client";

import { forwardRef, useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnClass, inputClass, type BtnVariant } from "./styles";

export { btnClass, inputClass };

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(inputClass, "resize-y leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(inputClass, "appearance-none bg-[length:16px] pr-9", className)} {...props} />;
});

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: BtnVariant; size?: "sm" | "md"; loading?: boolean }) {
  return (
    <button type="button" className={btnClass(variant, size, className)} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  id,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  id: string;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition",
          checked ? "border-accent bg-accent" : "border-line-strong bg-white/[0.06]",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
      <span className="text-fg/90">{label}</span>
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const published = status === "published";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        published ? "bg-accent/15 text-accent" : "bg-amber-400/10 text-amber-200",
      )}
    >
      <span className={cn("size-1.5 rounded-full", published ? "bg-accent" : "bg-amber-300")} />
      {published ? "Published" : "Draft"}
    </span>
  );
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cn("border-line rounded-2xl border bg-white/[0.025] p-5 sm:p-6", className)} {...rest}>
      {children}
    </div>
  );
}

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="text-muted mt-1.5 max-w-2xl text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyBlock({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border-line-strong flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="text-muted mt-2 text-sm">{children}</div>}
    </div>
  );
}

/** Accessible modal built on <dialog> (focus trap + Escape handled by the browser). */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "border-line-strong bg-bg-elevated text-fg m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border p-0 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm",
        wide ? "max-w-4xl" : "max-w-md",
      )}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col">
          <div className="border-line flex items-center justify-between border-b px-5 py-4">
            <h2 id={titleId} className="font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-muted hover:text-fg grid size-8 place-items-center rounded-lg hover:bg-white/10"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-300" aria-hidden />
        <div className="text-muted text-sm">{message}</div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
