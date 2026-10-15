import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/** Default "SZ" monogram favicon / touch icon. Replaced by a favicon uploaded in Admin → Settings. */
export function GET(request: NextRequest) {
  const px = Math.min(512, Math.max(16, Number(request.nextUrl.searchParams.get("size")) || 64));
  const r = px / 64;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #15181a, #050506)",
        borderRadius: 14 * r,
        border: `${Math.max(1, 2 * r)}px solid rgba(16,185,129,0.6)`,
        color: "#f5f5f4",
        fontSize: 30 * r,
        fontWeight: 700,
        letterSpacing: -1.5 * r,
      }}
    >
      SZ
    </div>,
    { width: px, height: px, headers: { "cache-control": "public, max-age=86400, immutable" } },
  );
}
