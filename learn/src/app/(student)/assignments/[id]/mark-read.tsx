"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck } from "lucide-react";
import { markReadAction } from "@/app/actions/student";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { tr } from "@/lib/i18n/tr";

export function MarkReadButton({ assignmentId }: { assignmentId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="lg"
      className="w-full"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await markReadAction(assignmentId);
          if (r.ok) {
            toast.success(tr("Belgilandi: o‘qib chiqildi"));
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      <BookOpenCheck /> {tr("O‘qib chiqdim")}
    </Button>
  );
}
