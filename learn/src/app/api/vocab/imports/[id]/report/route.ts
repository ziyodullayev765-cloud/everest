import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { importReportCsv } from "@/server/services/vocab-import";
import { AppError } from "@/server/errors";
import { tr } from "@/lib/i18n/tr";

/** GET /api/vocab/imports/<id>/report → CSV of the rows an import did not write (staff who may see the import). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("unauthenticated", tr("Tizimga kiring."));
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("invalid", tr("Import topilmadi."));
    const { name, body } = await importReportCsv(user, id);
    return new NextResponse(body, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`, "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    console.error("[import report]", e);
    return NextResponse.json({ ok: false, error: tr("Server xatosi") }, { status: 500 });
  }
}
