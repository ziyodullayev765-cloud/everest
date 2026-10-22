"use client";
import { useState, useTransition } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { askTutorAction } from "@/app/actions/tutor";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Input, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const PLACEHOLDER: Record<string, string> = {
  grammar: "Masalan: Present Perfect va Past Simple farqi nima?",
  mistake: "Savol: She ___ (go) to school yesterday.\nMening javobim: goed\nTo‘g‘ri javob: went",
  writing: "Inglizcha yozgan matningizni shu yerga qo‘ying…",
  vocabulary: "Masalan: take off",
  practice: "Masalan: Articles (a / an / the), A2",
  next: "Masalan: Reading 80%, Grammar (Present Perfect) 55%, so‘zlar takrorlashda ko‘p xato…",
};

export function TutorChat({ kinds, initialKind, initialText, remaining, limit }: { kinds: Record<string, string>; initialKind: string; initialText: string; remaining: number; limit: number }) {
  const [kind, setKind] = useState(initialKind);
  const [text, setText] = useState(initialText);
  const [extra, setExtra] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(remaining);
  const [pending, start] = useTransition();
  const ask = () =>
    start(async () => {
      setError(null);
      const r = await askTutorAction({ kind, text, extra });
      if (r.ok) {
        setAnswer(r.data.text);
        setLeft(r.data.remaining);
      } else setError(r.error);
    });
  return (
    <div className="space-y-4">
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist">
        {Object.entries(kinds).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", kind === k ? "border-primary bg-primary-soft text-primary-soft-fg" : "border-border bg-surface text-text-2 hover:bg-surface-2")}>
            {l}
          </button>
        ))}
      </div>
      <Card>
        <CardBody className="space-y-3">
          <Textarea rows={kind === "writing" ? 9 : 4} value={text} onChange={(e) => setText(e.target.value)} placeholder={PLACEHOLDER[kind]} maxLength={4000} aria-label="Savol" spellCheck={false} />
          {kind === "mistake" || kind === "vocabulary" ? (
            <Input value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={1000} placeholder={kind === "vocabulary" ? "Gap (kontekst), ixtiyoriy" : "Nimani tushunmadingiz? (ixtiyoriy)"} aria-label="Qo‘shimcha" />
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] text-muted tabular">
              Bugun qolgan: {left}/{limit}
            </span>
            <Button onClick={ask} loading={pending} disabled={text.trim().length < 2 || left === 0}>
              <Send /> So‘rash
            </Button>
          </div>
        </CardBody>
      </Card>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {answer ? (
        <Card className="animate-fade-up">
          <CardBody>
            <div className="mb-3 flex items-center gap-2 text-[12px] font-bold text-violet">
              <span className="grid size-7 place-items-center rounded-lg bg-violet-soft">
                <Bot className="size-4" aria-hidden />
              </span>
              AI tomonidan yaratilgan javob
              <Sparkles className="size-3.5" aria-hidden />
            </div>
            <div className="prose-text text-[14.5px] leading-relaxed">{answer}</div>
            <p className="mt-4 border-t border-border pt-3 text-[12px] text-muted">AI xato qilishi mumkin. Bu javob bahongizga ta’sir qilmaydi.</p>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
