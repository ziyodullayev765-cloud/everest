import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { gradebookCsv } from "@/server/services/grades";
import { AppError } from "@/server/errors";
import { toCsv } from "@/lib/utils";

/** GET /api/export/gradebook?class=<uuid>&subject=<uuid?> → CSV (requires reports.export). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const classId = url.searchParams.get("class") ?? "";
  const subjectId = url.searchParams.get("subject") || undefined;
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("unauthenticated", "Tizimga kiring.");
    if (!/^[0-9a-f-]{36}$/i.test(classId)) throw new AppError("invalid", "Guruh noto‘g‘ri.");
    const { filename, rows } = await gradebookCsv(user, classId, subjectId);
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    console.error("[export]", e);
    return NextResponse.json({ ok: false, error: "Server xatosi" }, { status: 500 });
  }
}
