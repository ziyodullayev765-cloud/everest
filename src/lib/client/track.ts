import { track } from "@vercel/analytics";

/** Custom analytics event (shown in Vercel → Analytics → Events). Never throws. */
export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  try {
    track(name, props);
  } catch {}
}
