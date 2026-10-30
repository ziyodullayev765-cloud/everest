import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getSettings } from "@/server/services/settings";
import { unseenAchievements } from "@/server/services/achievements";

export const dynamic = "force-dynamic";

/**
 * GET → the student's achievements not celebrated yet. A plain request (not a server action) so checking
 * after every page change never competes with the router's navigation.
 */
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const u = await getCurrentUser();
  if (!u || u.role !== "student") return NextResponse.json([], { headers });
  const settings = await getSettings();
  if (!settings.gamification.enabled || !u.gamificationEnabled) return NextResponse.json([], { headers });
  const rows = await unseenAchievements(u.id);
  return NextResponse.json(rows.map((a) => ({ ...a, earnedAt: a.earnedAt.toISOString() })), { headers });
}
