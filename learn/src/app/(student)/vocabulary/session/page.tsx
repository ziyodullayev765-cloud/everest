import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { sessionCards, type SessionMode } from "@/server/services/vocabulary";
import { VocabSession, type Kind } from "./vocab-session";
import { tr } from "@/lib/i18n/tr";

export const metadata: Metadata = { get title() { return tr("Lug‘at mashg‘uloti"); } };
export const dynamic = "force-dynamic";

const MODES: SessionMode[] = ["daily", "learn", "review", "difficult", "favorites"];
const KINDS: Kind[] = ["auto", "flashcard", "choice", "typing", "match"];

export default async function SessionPage({ searchParams }: { searchParams: Promise<{ mode?: string; kind?: string; list?: string }> }) {
  const user = await pageUser("student");
  const sp = await searchParams;
  const mode = MODES.includes(sp.mode as SessionMode) ? (sp.mode as SessionMode) : "daily";
  const kind = KINDS.includes(sp.kind as Kind) ? (sp.kind as Kind) : "auto";
  const listId = sp.list && /^[0-9a-f-]{36}$/i.test(sp.list) ? sp.list : null;
  const cards = await sessionCards(user, { mode, listId });
  return <VocabSession cards={cards} kind={kind} backHref={listId ? `/vocabulary/lists/${listId}` : "/vocabulary"} />;
}
