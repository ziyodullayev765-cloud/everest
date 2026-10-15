import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth";
import { safeInternalPath } from "@/lib/utils";

/** Enables draft preview for verified admins only, then redirects to the page. */
export async function GET(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", request.url));
  (await draftMode()).enable();
  const path = safeInternalPath(request.nextUrl.searchParams.get("path"));
  return NextResponse.redirect(new URL(path, request.url));
}
