"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck } from "lucide-react";
import { markReadAction } from "@/app/actions/student";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

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
            toast.success("Belgilandi: o‘qib chiqildi");
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      <BookOpenCheck /> O‘qib chiqdim
    </Button>
  );
}
