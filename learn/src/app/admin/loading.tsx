import { Skeleton } from "@/components/ui/feedback";
import { tr } from "@/lib/i18n/tr";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label={tr("Yuklanmoqda")}>
      <Skeleton className="mb-2 h-8 w-44" />
      <Skeleton className="mb-6 h-4 w-80 max-w-full" />
      <Skeleton className="mb-4 h-10 w-full max-w-md" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
