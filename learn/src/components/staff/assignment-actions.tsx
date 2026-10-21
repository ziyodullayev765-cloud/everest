"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy, Eye, RotateCcw, Send, Undo2 } from "lucide-react";
import { assignmentStatusAction, duplicateAssignmentAction } from "@/app/actions/staff";
import { Button, LinkButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

export function AssignmentActions({ id, base, status, canDuplicate }: { id: string; base: string; status: string; canDuplicate: boolean }) {
  const [pending, start] = useTransition();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const router = useRouter();
  const act = (action: "publish" | "archive" | "restore" | "unpublish", msg: string) =>
    start(async () => {
      const r = await assignmentStatusAction(id, action);
      setConfirmArchive(false);
      if (r.ok) {
        toast.success(msg);
        router.refresh();
      } else toast.error(r.error);
    });
  return (
    <>
      <LinkButton href={`${base}/assignments/${id}/preview`} variant="secondary" size="sm">
        <Eye /> Ko‘rib chiqish
      </LinkButton>
      {canDuplicate ? (
        <Button
          variant="secondary"
          size="sm"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await duplicateAssignmentAction(id);
              if (r.ok) {
                toast.success("Nusxa yaratildi");
                router.push(`${base}/assignments/${r.data.id}`);
              } else toast.error(r.error);
            })
          }
        >
          <Copy /> Nusxa
        </Button>
      ) : null}
      {status === "draft" ? (
        <Button size="sm" onClick={() => act("publish", "E’lon qilindi")} loading={pending}>
          <Send /> E’lon qilish
        </Button>
      ) : null}
      {status === "scheduled" ? (
        <Button variant="secondary" size="sm" onClick={() => act("unpublish", "Qoralamaga qaytarildi")} loading={pending}>
          <Undo2 /> Rejani bekor qilish
        </Button>
      ) : null}
      {status === "archived" ? (
        <Button variant="secondary" size="sm" onClick={() => act("restore", "Tiklandi")} loading={pending}>
          <RotateCcw /> Tiklash
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setConfirmArchive(true)}>
          <Archive /> Arxivlash
        </Button>
      )}
      <Dialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title="Vazifani arxivlaysizmi?"
        description="O‘quvchilar ro‘yxatidan yashiriladi. Topshirilgan ishlar va baholar o‘chirilmaydi — istalgan vaqtda tiklash mumkin."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmArchive(false)}>
              Bekor qilish
            </Button>
            <Button variant="danger" onClick={() => act("archive", "Arxivlandi")} loading={pending}>
              Arxivlash
            </Button>
          </>
        }
      />
    </>
  );
}
