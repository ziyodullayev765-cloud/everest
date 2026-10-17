/** vCard 3.0 text escaping: backslash, comma, semicolon and newlines. */
function esc(v: string) {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");
}

export interface VCardInput {
  name: string;
  title?: string;
  email?: string | null;
  phone?: string | null;
  url?: string;
  location?: string;
  links?: { label: string; url: string }[];
}

/** A contact card phones can import ("Add to contacts"). Lines end with CRLF as the spec asks. */
export function buildVCard(c: VCardInput): string {
  const [first = "", ...rest] = c.name.trim().split(/\s+/);
  const last = rest.join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(last)};${esc(first)};;;`,
    `FN:${esc(c.name.trim())}`,
    c.title ? `TITLE:${esc(c.title)}` : "",
    c.email ? `EMAIL;TYPE=INTERNET:${esc(c.email)}` : "",
    c.phone ? `TEL;TYPE=CELL:${esc(c.phone)}` : "",
    c.url ? `URL:${esc(c.url)}` : "",
    c.location ? `ADR;TYPE=HOME:;;;${esc(c.location)};;;` : "",
    ...(c.links ?? []).map((l) => `X-SOCIALPROFILE;TYPE=${esc(l.label.toLowerCase())}:${esc(l.url)}`),
    "END:VCARD",
  ];
  return lines.filter(Boolean).join("\r\n") + "\r\n";
}
