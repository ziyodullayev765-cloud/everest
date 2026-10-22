import { getCurrentUser } from "@/server/auth/session";
import { json, assertSameOrigin } from "@/server/http";
import { AppError } from "@/server/errors";
import { storeFile } from "@/server/services/files";
import { enforce } from "@/server/services/rate-limit";
import { tr } from "@/lib/i18n/tr";

/** POST multipart/form-data { file, visibility?, imagesOnly? } → { id, name, mime, size } */
export async function POST(req: Request) {
  return json(async () => {
    assertSameOrigin(req);
    const user = await getCurrentUser();
    if (!user) throw new AppError("unauthenticated", tr("Tizimga kiring."));
    await enforce(`upload:${user.id}`, 60, 3600);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("invalid", tr("Fayl topilmadi."));
    const visibility = form.get("visibility") === "public" ? "public" : "private";
    return storeFile(user, file, { visibility, imagesOnly: form.get("imagesOnly") === "1" });
  });
}
