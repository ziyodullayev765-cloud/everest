"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Library, Plus, Trash2 } from "lucide-react";
import { addToBankAction, deleteFromBankAction } from "@/app/actions/staff";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RichText } from "@/components/ui/rich-text";
import { toast } from "@/components/ui/toast";
import { t } from "@/lib/i18n";
import { QuestionEditorSingle } from "./question-single";

type Item = { id: string; type: string; prompt: string; points: number; subjectName: string; ownerName: string; mine: boolean; options: { label: string; isCorrect: boolean }[] };

export function BankManager({ subjects, defaultSubject, items, canDeleteAll }: { subjects: { id: string; name: string }[]; defaultSubject: string; items: Item[]; canDeleteAll: boolean }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus /> Savol qo‘shish
        </Button>
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((q) => (
            <Card key={q.id}>
              <CardBody className="flex gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                    <Badge tone="primary">{t.questionType[q.type as "essay"]}</Badge>
                    {q.subjectName} · {q.points} ball · {q.ownerName}
                  </div>
                  <RichText text={q.prompt} className="text-[14px] font-medium" />
                  {q.options.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.options.map((o, i) => (
                        <span key={i} className={`rounded-lg px-2 py-0.5 text-[12.5px] ${o.isCorrect ? "bg-success-soft text-success" : "bg-surface-2 text-text-2"}`}>
                          <RichText text={o.label} as="span" />
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {q.mine || canDeleteAll ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="O‘chirish"
                    loading={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await deleteFromBankAction(q.id);
                        if (r.ok) router.refresh();
                        else toast.error(r.error);
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon={<Library />} title="Bank bo‘sh" description="Bu yerga qo‘shilgan savollarni istalgan quizga qayta qo‘shish mumkin." />
        </Card>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title="Bankka savol qo‘shish" className="sm:max-w-2xl">
        <div className="mb-4">
          <Select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Fan">
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <QuestionEditorSingle
          onSave={async (q) => {
            const r = await addToBankAction(subject, q);
            if (r.ok) {
              toast.success("Qo‘shildi");
              setOpen(false);
              router.refresh();
            } else toast.error(r.error);
          }}
        />
      </Dialog>
    </>
  );
}
