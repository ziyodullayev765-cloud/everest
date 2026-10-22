"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { markNotificationsReadAction } from "@/app/actions/student";
import { Button } from "@/components/ui/button";
import { tr } from "@/lib/i18n/tr";

export function MarkAllRead() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button variant="secondary" size="sm" loading={pending} onClick={() => start(async () => { await markNotificationsReadAction(); router.refresh(); })}>
      <CheckCheck /> {tr("Barchasini o‘qilgan deb belgilash")}
    </Button>
  );
}

export function MarkOneRead({ id, unread, children }: { id: string; unread: boolean; children: React.ReactNode }) {
  return <div onClickCapture={() => { if (unread) void markNotificationsReadAction(id); }}>{children}</div>;
}
