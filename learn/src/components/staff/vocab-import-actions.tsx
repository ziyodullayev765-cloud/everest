"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { revertImportAction } from "@/app/actions/vocab";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { tr } from "@/lib/i18n/tr";

export function RevertImportButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const go = () =>
    start(async () => {
      const r = await revertImportAction(id);
      if (!r.ok) return void toast.error(r.error);
      toast.success(tr("Import bekor qilindi: {0} ta so‘z olib tashlandi, {1} tasi arxivlandi, {2} tasi tiklandi.", r.data.removed, r.data.archived, r.data.restored));
      setOpen(false);
      router.refresh();
    });
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}><Undo2 /> {tr("Bekor qilish")}</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={tr("Importni bekor qilasizmi?")}
        description={tr("Bu import qo‘shgan so‘zlar o‘chiriladi (o‘quvchilar o‘rgangan bo‘lsa — arxivlanadi, tarixi saqlanadi), o‘zgartirgan so‘zlari avvalgi holatiga qaytadi. Guruhlarga biriktirish o‘zgarmaydi.")}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>{tr("Yo‘q")}</Button><Button variant="danger" loading={pending} onClick={go}>{tr("Ha, bekor qilish")}</Button></>}
      />
    </>
  );
}
