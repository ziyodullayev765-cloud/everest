import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { authorizeFileRead, openFile } from "@/server/services/files";
import { AppError } from "@/server/errors";
import { tr } from "@/lib/i18n/tr";

const INLINE = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf", "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm", "audio/aac"]);

/** GET /api/files/:id — authorised download; supports Range so audio can seek (required by iOS Safari). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(tr("Not found"), { status: 404 });
  try {
    const user = await getCurrentUser();
    const f = await authorizeFileRead(user, id);
    const out = await openFile(f, req.headers.get("range"));
    const download = new URL(req.url).searchParams.has("download");
    const disposition = `${INLINE.has(f.mime) && !download ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`;
    return new NextResponse(out.body, {
      status: out.status,
      headers: {
        ...out.headers,
        "Content-Type": f.mime,
        "Content-Disposition": disposition,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'",
        // Private files must never be stored by shared caches or the service worker.
        "Cache-Control": f.visibility === "public" ? "public, max-age=86400, immutable" : "private, no-store",
        ETag: `"${f.sha256.replace(/[^a-z0-9]/gi, "").slice(0, 32)}"`,
      },
    });
  } catch (e) {
    if (e instanceof AppError) return new NextResponse(tr("Not found"), { status: 404, headers: { "Cache-Control": "no-store" } });
    console.error("[files]", e);
    return new NextResponse(tr("Server error"), { status: 500 });
  }
}
