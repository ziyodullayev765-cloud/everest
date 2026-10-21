"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { markNotificationsReadAction } from "@/app/actions/student";
import { Button } from "@/components/ui/button";

export function MarkAllRead() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button variant="secondary" size="sm" loading={pending} onClick={() => start(async () => { await markNotificationsReadAction(); router.refresh(); })}>
      <CheckCheck /> Barchasini o‘qilgan deb belgilash
    </Button>
  );
}

export function MarkOneRead({ id, unread, children }: { id: string; unread: boolean; children: React.ReactNode }) {
  return <div onClickCapture={() => { if (unread) void markNotificationsReadAction(id); }}>{children}</div>;
}
