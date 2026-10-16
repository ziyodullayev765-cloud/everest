import Link from "next/link";
import { ArrowUpRight, FolderKanban, Images, Inbox, Trophy } from "lucide-react";
import { ContentChart, MessagesChart, type ContentRow } from "@/components/admin/overview-charts";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth";
import { RESOURCES } from "@/lib/cms/resources";
import type { ActivityEntry } from "@/lib/types";
import { formatBytes, formatDateTime } from "@/lib/utils";

const ENTITY_LABEL: Record<string, string> = {
  projects: "Project",
  achievements: "Achievement",
  skills: "Skill",
  education: "Education",
  experience: "Experience",
  media: "Media",
  social_links: "Social link",
  stats: "Statistic",
  posts: "Post",
  testimonials: "Testimonial",
  profiles: "Profile",
  site_settings: "Settings",
};

export default async function Overview() {
  const { supabase } = await requireAdminPage();

  const content = await Promise.all(
    Object.values(RESOURCES).map(async (r) => {
      const [pub, draft] = await Promise.all([
        supabase.from(r.table).select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from(r.table).select("id", { count: "exact", head: true }).eq("status", "draft"),
      ]);
      return { key: r.key, type: r.label, published: pub.count ?? 0, draft: draft.count ?? 0 };
    }),
  );

  const since = new Date(Date.now() - 29 * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const [{ data: media }, { data: recentMsgs }, { count: newMsgs }, { count: totalMsgs }, { data: activity }] = await Promise.all(
    [
      supabase.from("media").select("size_bytes, kind"),
      supabase.from("contact_messages").select("created_at").gte("created_at", since.toISOString()),
      supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("contact_messages").select("id", { count: "exact", head: true }),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(12),
    ],
  );

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since.getTime() + i * 86_400_000);
    const day = d.toISOString().slice(0, 10);
    return { day, label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }), count: 0 };
  });
  for (const m of recentMsgs ?? []) {
    const slot = days.find((d) => d.day === (m.created_at as string).slice(0, 10));
    if (slot) slot.count++;
  }

  const projects = content.find((c) => c.key === "projects")!;
  const achievements = content.find((c) => c.key === "achievements")!;
  const mediaBytes = (media ?? []).reduce((s, m) => s + Number(m.size_bytes), 0);
  const chartRows: ContentRow[] = content.map(({ type, published, draft }) => ({ type, published, draft }));

  const tiles = [
    {
      label: "Projects",
      value: projects.published + projects.draft,
      note: `${projects.published} published`,
      href: "/admin/projects",
      icon: FolderKanban,
    },
    {
      label: "Published achievements",
      value: achievements.published,
      note: `${achievements.draft} in drafts`,
      href: "/admin/achievements",
      icon: Trophy,
    },
    { label: "Media files", value: media?.length ?? 0, note: formatBytes(mediaBytes), href: "/admin/media", icon: Images },
    { label: "Messages", value: totalMsgs ?? 0, note: `${newMsgs ?? 0} unread`, href: "/admin/messages", icon: Inbox },
  ];

  return (
    <>
      <PageTitle
        title="Overview"
        description="A snapshot of your portfolio content and activity."
        actions={
          <a
            href="/"
            target="_blank"
            rel="noopener"
            className="border-line inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm hover:bg-white/[0.06]"
          >
            View website <ArrowUpRight className="size-4" aria-hidden />
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="group border-line hover:border-line-strong rounded-2xl border bg-white/[0.025] p-4 transition sm:p-5"
          >
            <div className="text-muted flex items-center justify-between">
              <span className="text-xs sm:text-sm">{t.label}</span>
              <t.icon className="group-hover:text-accent size-4 transition" aria-hidden />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{t.value}</p>
            <p className="text-subtle mt-1 text-xs">{t.note}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Content by type</h2>
          <p className="text-subtle mb-4 text-xs">Published vs. draft items</p>
          <ContentChart data={chartRows} />
        </Card>
        <Card>
          <h2 className="font-semibold">Messages, last 30 days</h2>
          <p className="text-subtle mb-4 text-xs">{days.reduce((s, d) => s + d.count, 0)} received</p>
          <MessagesChart data={days} />
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 font-semibold">Recent edits</h2>
        {!activity?.length ? (
          <p className="text-muted text-sm">No edits yet. Changes you make in the dashboard will appear here.</p>
        ) : (
          <ul className="divide-line divide-y">
            {(activity as ActivityEntry[]).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="min-w-0 truncate">
                  <span className={a.action === "delete" ? "text-red-300" : a.action === "create" ? "text-accent" : "text-fg/80"}>
                    {a.action === "create" ? "Created" : a.action === "delete" ? "Deleted" : "Updated"}
                  </span>{" "}
                  <span className="text-subtle">{ENTITY_LABEL[a.entity] ?? a.entity}</span> {a.title && <span>“{a.title}”</span>}
                </span>
                <time className="text-subtle shrink-0 text-xs" dateTime={a.created_at}>
                  {formatDateTime(a.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
