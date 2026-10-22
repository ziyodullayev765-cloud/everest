"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinClassAction } from "@/app/actions/student";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function JoinClass() {
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Card>
      <CardHeader title="Kod orqali qo‘shilish" description="O‘qituvchingiz bergan 6 belgili kodni kiriting." />
      <CardBody>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await joinClassAction(code);
              if (r.ok) {
                toast.success(`${r.data.name} guruhiga qo‘shildingiz`);
                setCode("");
                router.refresh();
              } else toast.error(r.error);
            });
          }}
        >
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC123" aria-label="Guruh kodi" className="font-mono tracking-[0.3em] uppercase" autoCapitalize="characters" />
          <Button type="submit" loading={pending} disabled={code.length !== 6}>
            Qo‘shilish
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
