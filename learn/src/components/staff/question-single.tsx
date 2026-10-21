"use client";
import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionCard, QuestionTypeSelect, blankQuestion, type EditQuestion } from "./question-editor";

/** Single-question form used by the question bank. */
export function QuestionEditorSingle({ onSave }: { onSave: (q: unknown) => Promise<void> }) {
  const [q, setQ] = useState<EditQuestion>(blankQuestion("single_choice"));
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <QuestionTypeSelect value={q.type} onChange={(v) => setQ(blankQuestion(v as EditQuestion["type"]))} />
      <QuestionCard q={q} index={0} count={1} onChange={(patch) => setQ((x) => ({ ...x, ...patch }))} />
      <Button
        loading={pending}
        onClick={() =>
          start(async () => {
            const { key: _k, ...rest } = q;
            void _k;
            await onSave({ ...rest, accepted: rest.accepted.map((a) => a.map((x) => x.trim()).filter(Boolean)) });
          })
        }
      >
        <Save /> Saqlash
      </Button>
    </div>
  );
}
