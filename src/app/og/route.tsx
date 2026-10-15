import { ImageResponse } from "next/og";
import { getProfile, getSettings } from "@/lib/data/public";
import { brandAssetDataUrl } from "@/lib/brand-assets";
import { isPlaceholder } from "@/lib/defaults";

export const runtime = "nodejs";
export const revalidate = 3600;

const size = { width: 1200, height: 630 };

/**
 * Default social sharing card (used when no image is set in Admin → Settings → SEO).
 * Text comes from the CMS; the background is the Higgsfield-generated artwork when present.
 */
export async function GET() {
  const [settings, profile] = await Promise.all([getSettings(), getProfile()]);
  const bg = brandAssetDataUrl("og-background.jpg");
  const headline = isPlaceholder(profile.headline) ? "" : profile.headline;
  const accent = settings.accent_color;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#050506",
        color: "#f5f5f4",
      }}
    >
      {bg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bg} alt="" width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover" }} />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `radial-gradient(circle at 78% 50%, ${accent}55, transparent 45%)`,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: "linear-gradient(90deg, rgba(5,5,6,0.92) 0%, rgba(5,5,6,0.6) 50%, rgba(5,5,6,0) 75%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 80px",
          width: 760,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, letterSpacing: 6, color: accent }}>
          <div style={{ width: 36, height: 2, background: accent }} />
          PORTFOLIO
        </div>
        <div style={{ marginTop: 26, fontSize: 78, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3 }}>
          {profile.full_name}
        </div>
        {headline && <div style={{ marginTop: 22, fontSize: 32, color: "#a1a1aa" }}>{headline}</div>}
      </div>
    </div>,
    size,
  );
}
