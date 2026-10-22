import Link from "next/link";
import { Bell, CalendarClock, ClipboardList, Megaphone, MessageSquareText, Star, BarChart3, Inbox, Award } from "lucide-react";
import { listNotifications } from "@/server/services/notifications";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { MarkAllRead, MarkOneRead } from "./notification-actions";
import { tr } from "@/lib/i18n/tr";

const ICON: Record<string, typeof Bell> = { new_assignment: ClipboardList, deadline: CalendarClock, submission: Inbox, grade: Star, feedback: MessageSquareText, weekly_summary: BarChart3, announcement: Megaphone, system: Award };

export async function NotificationsView({ userId }: { userId: string }) {
  const items = await listNotifications(userId, 100);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={tr("Bildirishnomalar")} description={unread ? tr("{0} ta o‘qilmagan", unread) : tr("Barchasi o‘qilgan")} actions={unread ? <MarkAllRead /> : null} />
      <Card className="overflow-hidden">
        {items.length ? (
          <ul className="divide-y divide-border">
            {items.map((n) => {
              const Icon = ICON[n.type] ?? Bell;
              const body = (
                <>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", n.readAt ? "bg-surface-2 text-muted" : "bg-primary-soft text-primary")}>
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[14px]", n.readAt ? "text-text-2" : "font-bold text-text")}>{n.title}</span>
                    {n.body ? <span className="mt-0.5 block text-[13px] text-muted">{n.body}</span> : null}
                    <span className="mt-1 block text-[12px] text-muted">{formatDateTime(n.createdAt)}</span>
                  </span>
                  {!n.readAt ? <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label={tr("O‘qilmagan")} /> : null}
                </>
              );
              return (
                <li key={n.id} className="relative">
                  {n.link ? (
                    <MarkOneRead id={n.id} unread={!n.readAt}>
                      <Link href={n.link} className="flex gap-3 px-5 py-4 hover:bg-surface-2">
                        {body}
                      </Link>
                    </MarkOneRead>
                  ) : (
                    <div className="flex gap-3 px-5 py-4">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={<Bell />} title={tr("Bildirishnomalar yo‘q")} description={tr("Yangi vazifalar, baholar va e’lonlar haqida shu yerda xabar beramiz.")} />
        )}
      </Card>
    </div>
  );
}
