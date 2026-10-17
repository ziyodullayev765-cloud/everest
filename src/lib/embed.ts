/**
 * Turns a share link into one that may be shown inside an <iframe>.
 * Known services get their official embed URL; anything else is used as is
 * (it must be https). Returns null for links that cannot be embedded safely.
 */
export function embedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v") ?? (u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : null);
    if (u.pathname.startsWith("/embed/")) return `https://www.youtube-nocookie.com${u.pathname}`;
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
  }
  if (host === "vimeo.com" && /^\/\d+/.test(u.pathname)) {
    return `https://player.vimeo.com/video/${u.pathname.split("/")[1]}`;
  }
  if (host === "figma.com" && !u.pathname.startsWith("/embed")) {
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(u.toString())}`;
  }
  if (host === "codesandbox.io" && u.pathname.startsWith("/s/")) {
    return `https://codesandbox.io/embed/${u.pathname.slice(3)}`;
  }
  if (host === "stackblitz.com" && !u.searchParams.has("embed")) {
    u.searchParams.set("embed", "1");
  }
  return u.toString();
}
