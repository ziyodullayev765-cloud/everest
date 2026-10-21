import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { authorizeFileRead } from "@/server/services/files";
import { AppError } from "@/server/errors";

const INLINE = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]);

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  try {
    const user = await getCurrentUser();
    const f = await authorizeFileRead(user, id);
    const disposition = `${INLINE.has(f.mime) ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`;
    return new NextResponse(new Uint8Array(f.data), {
      headers: {
        "Content-Type": f.mime,
        "Content-Length": String(f.size),
        "Content-Disposition": disposition,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
        // Private files must never be stored by shared caches or the service worker.
        "Cache-Control": f.visibility === "public" ? "public, max-age=86400, immutable" : "private, no-store",
        ETag: `"${f.sha256.slice(0, 32)}"`,
      },
    });
  } catch (e) {
    if (e instanceof AppError) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    console.error("[files]", e);
    return new NextResponse("Server error", { status: 500 });
  }
}
