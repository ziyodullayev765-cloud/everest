"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { vocabGoalAction } from "@/app/actions/vocab";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { tr } from "@/lib/i18n/tr";

export function VocabGoal({ value }: { value: number }) {
  const [v, setV] = useState(value);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Card>
      <CardHeader title={tr("Kuniga yangi so‘zlar")} description={tr("Takrorlashlar soniga ta’sir qilmaydi")} />
      <CardBody className="pt-3">
        <Select
          value={v}
          disabled={pending}
          aria-label={tr("Kuniga yangi so‘zlar soni")}
          onChange={(e) => {
            const n = Number(e.target.value);
            setV(n);
            start(async () => {
              const r = await vocabGoalAction(n);
              if (r.ok) {
                toast.success(tr("Saqlandi"));
                router.refresh();
              } else toast.error(r.error);
            });
          }}
        >
          {[0, 5, 10, 15, 20, 30].map((n) => (
            <option key={n} value={n}>
              {n === 0 ? tr("Yangi so‘z olmaslik") : tr("{0} ta", n)}
            </option>
          ))}
        </Select>
      </CardBody>
    </Card>
  );
}
