import type { ReactNode } from "react";

/** Re-mounts on every navigation, so each page plays a slow fade-and-rise entrance. */
export default function SiteTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
