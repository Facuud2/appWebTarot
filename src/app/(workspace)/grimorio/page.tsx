import type { Metadata } from "next";
import { GrimorioBrowserClient } from "@/features/grimorio/grimorio-browser-client";
import {
  listDecks,
  listGrimorioCards,
  listSpreadTemplates,
} from "@/repositories/grimorio-repository";
import { requireUser } from "@/server/session";

export const metadata: Metadata = {
  title: "Cartas y mazos",
};

export default async function GrimorioPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; editDeckId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const cards = await listGrimorioCards(user.id);
  const decks = await listDecks(user.id);
  const spreads = await listSpreadTemplates(user.id);

  const defaultTab = params.editDeckId
    ? "mazos"
    : params.tab === "mazos" || params.tab === "tiradas"
      ? params.tab
      : "cartas";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl text-ink">Cartas y mazos</h1>
        <p className="text-sm text-muted">
          Catálogo de las 78 cartas con tus notas personales, tus mazos registrados y tus estructuras de tirada.
        </p>
      </header>

      <GrimorioBrowserClient
        initialCards={cards}
        initialDecks={decks}
        initialSpreads={spreads}
        defaultTab={defaultTab}
        initialEditDeckId={params.editDeckId}
      />
    </div>
  );
}
