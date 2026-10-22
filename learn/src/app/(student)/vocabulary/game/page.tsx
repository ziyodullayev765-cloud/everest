import type { Metadata } from "next";
import { pageUser } from "@/server/auth/guards";
import { gameBest, gameCards } from "@/server/services/vocabulary";
import { VocabGame } from "./vocab-game";

export const metadata: Metadata = { title: "So‘z o‘yini" };
export const dynamic = "force-dynamic";

export default async function GamePage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const user = await pageUser("student");
  const sp = await searchParams;
  const listId = sp.list && /^[0-9a-f-]{36}$/i.test(sp.list) ? sp.list : null;
  const [cards, best] = await Promise.all([gameCards(user, listId), gameBest(user, listId)]);
  return <VocabGame cards={cards} listId={listId} best={best.best} backHref={listId ? `/vocabulary/lists/${listId}` : "/vocabulary"} />;
}
