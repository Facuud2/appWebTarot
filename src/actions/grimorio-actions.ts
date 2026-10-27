import { callRpc } from "@/lib/rpc-client";
import type {
  DeckFormValues,
  PersonalCardEntryValues,
  SpreadTemplateFormValues,
} from "@/schemas/domain";
import type {
  ActionResult,
  CanonicalCard,
  Deck,
  PersonalCardEntry,
  SpreadTemplate,
} from "@/types/domain";

export async function savePersonalCardEntryAction(
  slug: string,
  input: PersonalCardEntryValues
): Promise<ActionResult<PersonalCardEntry>> {
  return callRpc<PersonalCardEntry>("grimorio.saveCardEntry", { slug, input });
}

export async function createDeckAction(
  input: DeckFormValues
): Promise<ActionResult<Deck>> {
  return callRpc<Deck>("grimorio.createDeck", input);
}

export async function createQuickDeckAction(
  name: string
): Promise<ActionResult<Deck>> {
  return callRpc<Deck>("grimorio.createQuickDeck", { name });
}

export async function updateDeckAction(
  deckId: string,
  input: DeckFormValues
): Promise<ActionResult<Deck>> {
  return callRpc<Deck>("grimorio.updateDeck", { deckId, input });
}

export async function deleteDeckAction(
  deckId: string
): Promise<ActionResult<null>> {
  return callRpc<null>("grimorio.deleteDeck", { deckId });
}

export async function createSpreadTemplateAction(
  input: SpreadTemplateFormValues
): Promise<ActionResult<SpreadTemplate>> {
  return callRpc<SpreadTemplate>("grimorio.createSpread", input);
}

export async function deleteSpreadTemplateAction(
  spreadId: string
): Promise<ActionResult<null>> {
  return callRpc<null>("grimorio.deleteSpread", { spreadId });
}

export async function registerCustomCardAction(input: {
  name: string;
  deckId: string;
}): Promise<ActionResult<CanonicalCard>> {
  return callRpc<CanonicalCard>("grimorio.registerCustomCard", input);
}
