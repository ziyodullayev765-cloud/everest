"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { navigate } from "@/lib/navigate";
import { Play } from "lucide-react";
import { startQuizAction } from "@/app/actions/student";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { tr } from "@/lib/i18n/tr";

export function StartQuizButton({ assignmentId, label, confirmTimed }: { assignmentId: string; label: string; confirmTimed?: number | null }) {
  // Plain loading state, not a transition: a transition still waiting on the action would hold back the
  // page change (React finishes pending transitions together), which left students stuck on this page.
  const [pending, setPending] = useState(false);
  const [ask, setAsk] = useState(false);
  const router = useRouter();
  const go = async () => {
    if (pending) return;
    setPending(true);
    const r = await startQuizAction(assignmentId).catch(() => ({ ok: false as const, error: tr("Internet aloqasi yo‘q. Qayta urinib ko‘ring.") }));
    if (r.ok) return navigate(router, `/quizzes/${assignmentId}/attempt/${r.data.attemptId}`);
    setPending(false);
    setAsk(false);
    toast.error(r.error);
    router.refresh();
  };
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
