import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DEFAULT_NAV } from "@/lib/defaults";
import { getCopy } from "@/lib/i18n/server";

/** Large "next page" link at the foot of each menu page, so the site reads like chapters. */
export async function PageNext({ current }: { current: string }) {
  const copy = await getCopy();
  const order = DEFAULT_NAV.map((n) => n.href);
  const i = order.indexOf(current);
  if (i < 0) return null;
  const href = order[(i + 1) % order.length]!;
  return (
    <div className="mx-auto mt-24 w-[min(1200px,calc(100%-2rem))] sm:mt-32">
      <Link href={href} className="page-next group">
        <span className="ed-eyebrow">{copy.homePage.nextPage}</span>
        <span className="page-next-title">
          {copy.nav[href] ?? href}
          <ArrowRight className="page-next-arrow" aria-hidden />
        </span>
      </Link>
    </div>
  );
}
