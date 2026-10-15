import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { copy } from "@/lib/copy";

export function NotFoundContent() {
  return (
    <section className="container-x flex min-h-[80svh] flex-col items-center justify-center pt-24 text-center">
      <p className="text-gradient text-[clamp(6rem,22vw,14rem)] leading-none font-semibold tracking-[-0.06em]">404</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{copy.notFound.title}</h1>
      <p className="text-muted mt-3 max-w-md">{copy.notFound.lead}</p>
      <Link href="/" className={buttonClass("primary", "lg", "mt-10")}>
        <ArrowLeft className="size-4" aria-hidden />
        {copy.notFound.home}
      </Link>
    </section>
  );
}
