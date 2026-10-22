"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Save, XCircle } from "lucide-react";
import { finalizeAction, gradeAction, gradeAttemptAction, returnAction } from "@/app/actions/staff";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea, Switch } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RichText } from "@/components/ui/rich-text";
import { toast } from "@/components/ui/toast";
import { t } from "@/lib/i18n";

type Rubric = { id: string; title: string; description?: string; maxPoints: number }[];

export function GradeForm({ assignmentId, studentId, maxScore, rubric, isLate, latePenaltyPercent, current, canEditFinal, returned }: { assignmentId: string; studentId: string; maxScore: number; rubric: Rubric; isLate: boolean; latePenaltyPercent: number; current: { points: number; status: "provisional" | "final"; rubricScores: Record<string, number> } | null; canEditFinal: boolean; returned: boolean }) {
  const final = current?.status === "final";
  const [points, setPoints] = useState<string>(current ? String(current.points) : "");
  const [scores, setScores] = useState<Record<string, string>>(Object.fromEntries(rubric.map((c) => [c.id, current?.rubricScores?.[c.id] != null ? String(current.rubricScores[c.id]) : ""])));
  const [feedback, setFeedback] = useState("");
  const [reason, setReason] = useState("");
  const [applyLate, setApplyLate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ret, setRet] = useState(false);
  const [retMsg, setRetMsg] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const raw = rubric.length ? rubric.reduce((s, c) => s + (Number(scores[c.id]) || 0), 0) : Number(points) || 0;
  const penalty = isLate && applyLate && latePenaltyPercent ? Math.min(raw, (maxScore * latePenaltyPercent) / 100) : 0;
  const locked = final && !canEditFinal;

  const save = (finalize: boolean) =>
    start(async () => {
      setError(null);
      const r = await gradeAction(assignmentId, studentId, {
        points: rubric.length ? undefined : Number(points),
        rubricScores: rubric.length ? Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Number(v)])) : {},
        feedback,
        finalize,
        reason,
        applyLatePenalty: applyLate,
      });
      if (r.ok) {
        toast.success(r.data.status === "final" ? `Baho yakunlandi: ${r.data.points}` : "Dastlabki baho saqlandi");
        setFeedback("");
        setReason("");
        router.refresh();
      } else setError(r.error);
    });

  return (
    <Card>
      <CardHeader title="Baholash" description={`Maksimal ${maxScore} ball`} action={current ? <Badge tone={final ? "success" : "warning"}>{t.gradeStatus[current.status]}</Badge> : null} />
      <CardBody className="space-y-4 pt-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {returned ? <Alert tone="warning">Ish qayta ishlashga qaytarilgan — o‘quvchi yangi versiyani topshirishini kuting.</Alert> : null}
        {locked ? <Alert tone="info">Baho yakunlangan. O‘zgartirish uchun “Yakuniy baholarni o‘zgartirish” ruxsati kerak.</Alert> : null}
        {final && canEditFinal ? <Alert tone="warning">Yakuniy baho o‘zgartiriladi — sabab majburiy va audit jurnaliga yoziladi.</Alert> : null}
        {rubric.length ? (
          <div className="space-y-2.5">
            {rubric.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-[13.5px]">
                  <div className="font-semibold">{c.title}</div>
                  {c.description ? <div className="text-[12px] text-muted">{c.description}</div> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-[13px] text-muted">
                  <Input type="number" inputMode="decimal" min={0} max={c.maxPoints} step="0.5" value={scores[c.id]} onChange={(e) => setScores({ ...scores, [c.id]: e.target.value })} className="h-9 w-20 text-right" aria-label={c.title} disabled={locked} />/ {c.maxPoints}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Field label="Ball" htmlFor="pts">
            <div className="flex items-center gap-2">
              <Input id="pts" type="number" inputMode="decimal" min={0} max={maxScore} step="0.5" value={points} onChange={(e) => setPoints(e.target.value)} className="text-[18px] font-bold" disabled={locked} />
              <span className="shrink-0 text-muted">/ {maxScore}</span>
            </div>
          </Field>
        )}
        {isLate && latePenaltyPercent ? <Switch checked={applyLate} onChange={setApplyLate} label={`Kechikish jarimasi (−${latePenaltyPercent}%)`} description={penalty ? `−${penalty} ball → yakuniy ${Math.max(0, raw - penalty)}` : undefined} disabled={locked} /> : null}
        <Field label="Izoh o‘quvchiga" htmlFor="fb">
          <Textarea id="fb" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Nima yaxshi chiqdi, nimani yaxshilash kerak…" disabled={locked} />
        </Field>
        {final && canEditFinal ? (
          <Field label="O‘zgartirish sababi" htmlFor="reason" required>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Masalan: apellyatsiya natijasi" />
          </Field>
        ) : null}
        {!locked ? (
          <div className="flex flex-col gap-2">
            {!final ? (
              <>
                <Button onClick={() => save(true)} loading={pending}>
                  <CheckCircle2 /> Yakunlash va e’lon qilish
                </Button>
                <Button variant="secondary" onClick={() => save(false)} loading={pending}>
                  <Save /> Dastlabki sifatida saqlash
                </Button>
                {!returned ? (
                  <Button variant="ghost" onClick={() => setRet(true)}>
                    <RotateCcw /> Qayta ishlashga qaytarish
                  </Button>
                ) : null}
              </>
            ) : (
              <Button onClick={() => save(true)} loading={pending} disabled={reason.trim().length < 5}>
                <Save /> Bahoni o‘zgartirish
              </Button>
            )}
          </div>
        ) : null}
      </CardBody>
      <Dialog
        open={ret}
        onClose={() => setRet(false)}
        title="Qayta ishlashga qaytarish"
        description="O‘quvchi xabar oladi va ishini yangilab qayta topshira oladi."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRet(false)}>
              Bekor qilish
            </Button>
            <Button
              loading={pending}
              disabled={retMsg.trim().length < 3}
              onClick={() =>
                start(async () => {
                  const r = await returnAction(assignmentId, studentId, retMsg);
                  if (r.ok) {
                    toast.success("Ish qaytarildi");
                    setRet(false);
                    router.refresh();
                  } else toast.error(r.error);
                })
              }
            >
              Qaytarish
            </Button>
          </>
        }
      >
        <Textarea rows={4} value={retMsg} onChange={(e) => setRetMsg(e.target.value)} placeholder="Nimani tuzatish kerakligini yozing…" aria-label="Qaytarish sababi" />
      </Dialog>
    </Card>
  );
}

type Item = { questionId: string; type: string; prompt: string; maxPoints: number; answerText: string; correctText: string; isCorrect: boolean | null; points: number | null; manual: boolean };

export function QuizGradeForm({ attemptId, items }: { attemptId: string; items: Item[] }) {
  const [pts, setPts] = useState<Record<string, string>>(Object.fromEntries(items.filter((i) => i.manual).map((i) => [i.questionId, i.points == null ? "" : String(i.points)])));
  const [pending, start] = useTransition();
  const router = useRouter();
  const manual = items.filter((i) => i.manual);
  return (
    <div className="space-y-3">
      {items.map((i, n) => (
        <div key={i.questionId} className="rounded-xl border border-border p-3.5">
          <div className="mb-1 flex items-center justify-between gap-2 text-[12px] text-muted">
            <span>
              {n + 1}. {t.questionType[i.type as "essay"]}
            </span>
            {i.manual ? (
              <span className="flex items-center gap-1.5">
                <Input type="number" min={0} max={i.maxPoints} step="0.5" value={pts[i.questionId]} onChange={(e) => setPts({ ...pts, [i.questionId]: e.target.value })} className="h-8 w-20 text-right" aria-label="Ball" />/ {i.maxPoints}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 tabular">
                {i.isCorrect ? <CheckCircle2 className="size-3.5 text-success" /> : <XCircle className="size-3.5 text-danger" />}
                {i.points ?? 0} / {i.maxPoints}
              </span>
            )}
          </div>
          <RichText text={i.prompt} className="text-[13.5px] font-semibold" />
          <div className="mt-1.5 rounded-lg bg-surface-2 px-3 py-2 text-[13.5px]">
            <span className="text-muted">Javob: </span>
            <span className="prose-text">{i.answerText}</span>
          </div>
          {!i.manual && i.correctText ? <div className="mt-1 text-[12.5px] text-success">To‘g‘ri: {i.correctText}</div> : null}
        </div>
      ))}
      {manual.length ? (
        <Button
          loading={pending}
          disabled={manual.some((m) => pts[m.questionId] === "")}
          onClick={() =>
            start(async () => {
              const r = await gradeAttemptAction(attemptId, Object.fromEntries(Object.entries(pts).map(([k, v]) => [k, Number(v)])));
              if (r.ok) {
                toast.success("Baholandi");
                router.refresh();
              } else toast.error(r.error);
            })
          }
        >
          <Save /> Qo‘lda baholashni saqlash
        </Button>
      ) : null}
    </div>
  );
}

export function FinalizeButton({ gradeId }: { gradeId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await finalizeAction(gradeId);
          if (r.ok) {
            toast.success("Baho yakunlandi");
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      <CheckCircle2 /> Yakunlash
    </Button>
  );
}
