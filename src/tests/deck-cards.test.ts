import { describe, expect, it } from "vitest";
import { selectDeckCards } from "@/lib/deck-cards";
import type { CanonicalCard, Deck } from "@/types/domain";

function makeCard(id: string, deckTradition: string): CanonicalCard {
  return {
    id,
    slug: id,
    arcana: "major",
    suit: null,
    rankNumber: 1,
    romanNumeral: "I",
    canonicalName: id,
    nameEn: id,
    deckTradition,
    searchKeywords: [],
    traditionalUpright: "",
    traditionalReversed: "",
    traditionalKeywords: [],
    archetypeNote: "",
  };
}

function makeDeck(
  id: string,
  tradition: Deck["tradition"],
  isBuiltin = false
): Deck {
  return {
    id,
    userId: "user-1",
    name: id,
    tradition,
    author: null,
    cardCount: 78,
    description: "",
    isDefault: false,
    needsSetup: false,
    isBuiltin,
    createdAt: "",
    readingsCount: 0,
  };
}

describe("selectDeckCards", () => {
  it("uses canonical tradition cards for legacy custom decks without catalog rows", () => {
    const rwsCard = makeCard("rws-fool", "rws");
    const deck = makeDeck("deck-rws-legacy", "rws");

    expect(selectDeckCards([rwsCard], [deck], [deck.id])).toEqual([rwsCard]);
  });

  it("prefers deck-specific rows when a custom deck has its own catalog", () => {
    const canonicalCard = makeCard("rws-fool", "rws");
    const customCard = makeCard("deck-rws-custom-fool", "deck-rws-custom");
    const deck = makeDeck("deck-rws-custom", "rws");

    expect(
      selectDeckCards([canonicalCard, customCard], [deck], [deck.id])
    ).toEqual([customCard]);
  });

  it("does not populate an empty deck with an unknown tradition", () => {
    const deck = makeDeck("deck-oracle", "other");

    expect(selectDeckCards([makeCard("rws-fool", "rws")], [deck], [deck.id]))
      .toEqual([]);
  });
});
