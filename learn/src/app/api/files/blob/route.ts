import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/server/auth/session";
import { assertSameOrigin } from "@/server/http";
import { AppError } from "@/server/errors";
import { ALLOWED_MIME, IMAGE_MIME, blobEnabled, blobMaxBytes, blobPrefix } from "@/server/services/files";
import { enforce } from "@/server/services/rate-limit";
import { tr } from "@/lib/i18n/tr";

/**
 * POST /api/files/blob — issues a short-lived client token so the browser can upload a large file
 * straight to the private Blob store. Only for the signed-in user's own prefix, allowed types and size.
 * The file isn't usable until /api/files/register verifies it.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!blobEnabled()) throw new AppError("invalid", tr("Katta fayllar ombori sozlanmagan."));
    const user = await getCurrentUser();
    if (!user) throw new AppError("unauthenticated", tr("Tizimga kiring."));
    const body = (await req.json()) as HandleUploadBody;
    if (body.type !== "blob.generate-client-token") throw new AppError("invalid", tr("Noto‘g‘ri so‘rov."));
    await enforce(`upload:${user.id}`, 120, 3600);
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith(blobPrefix(user)) || pathname.includes("..")) throw new AppError("forbidden", tr("Ruxsat yo‘q."));
        const imagesOnly = clientPayload === "imagesOnly";
        return {
          allowedContentTypes: imagesOnly ? IMAGE_MIME : [...ALLOWED_MIME, "audio/x-m4a", "audio/mp3", "audio/x-wav", "application/octet-stream"],
          maximumSizeInBytes: blobMaxBytes(user),
          addRandomSuffix: true,
          validUntil: Date.now() + 30 * 60_000,
        };
      },
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[blob-token]", e);
    return NextResponse.json({ error: tr("Yuklash boshlanmadi.") }, { status: 400 });
  }
}
