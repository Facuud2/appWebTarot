import type { CanonicalCard, Deck } from "@/types/domain";

const BUILTIN_TRADITIONS = new Set<string>([
  "rws",
  "marseille",
  "thoth",
  "lenormand",
  "living_wheel",
]);

export function isBuiltinDeck(deck: Deck): boolean {
  return deck.isBuiltin ?? BUILTIN_TRADITIONS.has(deck.tradition);
}

export function selectDeckCards(
  cards: CanonicalCard[],
  decks: Deck[],
  deckIds: readonly string[]
): CanonicalCard[] {
  const activeDecks = decks.filter((deck) => deckIds.includes(deck.id));
  const catalogTraditions = new Set(cards.map((card) => card.deckTradition));
  const selectedTraditions = new Set<string>();
  const selectedCustomIds = new Set<string>();

  for (const deck of activeDecks) {
    if (isBuiltinDeck(deck)) {
      selectedTraditions.add(deck.tradition);
    } else if (catalogTraditions.has(deck.id)) {
      selectedCustomIds.add(deck.id);
    } else if (deck.tradition !== "other") {
      selectedTraditions.add(deck.tradition);
    }
  }

  return cards.filter(
    (card) =>
      selectedTraditions.has(card.deckTradition) ||
      selectedCustomIds.has(card.deckTradition)
  );
}
