import { Eye } from "lucide-react";
import { getCopy } from "@/lib/i18n/server";

export async function PreviewBanner() {
  const copy = await getCopy();
  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div className="glass flex items-center gap-3 rounded-full py-2 pr-2 pl-4 text-sm shadow-2xl" role="status">
        <Eye className="text-accent size-4" aria-hidden />
        <span>{copy.previewBanner}</span>
        <a href="/api/preview/exit" className="rounded-full bg-white/10 px-3 py-1 font-medium hover:bg-white/15">
          {copy.exitPreview}
        </a>
      </div>
    </div>
  );
}
