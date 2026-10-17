import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { getCopy } from "@/lib/i18n/server";
import { LostLettersGame } from "./lost-letters-game";

export async function NotFoundContent() {
  const copy = await getCopy();
  return (
    <section className="container-x flex min-h-[80svh] flex-col items-center justify-center pt-24 text-center">
      <p className="font-display text-[clamp(6rem,22vw,14rem)] leading-none tracking-[-0.04em] text-[var(--name-tint)] italic">
        404
      </p>
      <h1 className="font-display mt-4 text-2xl tracking-tight normal-case sm:text-3xl">{copy.notFound.title}</h1>
      <p className="text-muted mt-3 max-w-md">{copy.notFound.lead}</p>
      <Link href="/" className={buttonClass("primary", "lg", "mt-10")}>
        <ArrowLeft className="size-4" aria-hidden />
        {copy.notFound.home}
      </Link>
      <LostLettersGame labels={copy.notFound.game} />
    </section>
  );
}
