"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible modal built on <dialog> (focus trap, Esc to close, backdrop). Bottom sheet on phones. */
export function Dialog({ open, onClose, title, description, children, footer, className }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer?: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none rounded-t-3xl border border-border bg-surface p-0 text-text shadow-pop backdrop:bg-black/45 backdrop:backdrop-blur-[2px] sm:m-auto sm:max-w-lg sm:rounded-2xl",
        "open:animate-fade-up",
        className,
      )}
    >
      <div className="max-h-[85dvh] overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-bold tracking-[-0.01em]">{title}</h2>
            {description ? <p className="mt-1 text-[13.5px] text-muted">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Yopish">
            <X className="size-4" />
          </button>
        </div>
        {children}
        {footer ? <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div> : null}
      </div>
    </dialog>
  );
}
