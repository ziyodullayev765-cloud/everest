"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { startQuizAction } from "@/app/actions/student";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { tr } from "@/lib/i18n/tr";

export function StartQuizButton({ assignmentId, label, confirmTimed }: { assignmentId: string; label: string; confirmTimed?: number | null }) {
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  const router = useRouter();
  const go = () =>
    start(async () => {
      const r = await startQuizAction(assignmentId);
      if (r.ok) router.push(`/quizzes/${assignmentId}/attempt/${r.data.attemptId}`);
      else {
        setAsk(false);
        toast.error(r.error);
        router.refresh();
      }
    });
  return (
    <>
      <Button size="lg" onClick={() => (confirmTimed ? setAsk(true) : go())} loading={pending && !ask} className="w-full sm:w-auto">
        <Play /> {label}
      </Button>
      <Dialog
        open={ask}
        onClose={() => setAsk(false)}
        title={tr("Tayyormisiz?")}
        description={tr("Sizda {0} daqiqa bo‘ladi. Taymer boshlangandan keyin to‘xtamaydi.", confirmTimed)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAsk(false)}>
              {tr("Keyinroq")}
            </Button>
            <Button onClick={go} loading={pending}>
              {tr("Boshlash")}
            </Button>
          </>
        }
      />
    </>
  );
}
