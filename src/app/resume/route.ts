import { NextResponse } from "next/server";
import { getProfile, getSettings } from "@/lib/data/public";
import { isSafeHref } from "@/lib/utils";

/** Stable, shareable CV link: the uploaded CV file when there is one, otherwise the generated PDF. */
export async function GET(request: Request) {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  if (settings.show_resume && profile.resume_url && isSafeHref(profile.resume_url)) {
    return NextResponse.redirect(new URL(profile.resume_url, request.url));
  }
  return NextResponse.redirect(new URL("/cv.pdf", request.url));
}
