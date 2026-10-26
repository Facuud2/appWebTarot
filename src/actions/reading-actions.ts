import { callRpc } from "@/lib/rpc-client";
import type {
  CreateReadingValues,
  DeckEventFormValues,
  UpdateReadingSessionValues,
} from "@/schemas/domain";
import type { ActionResult, DeckEvent, ReadingDetail } from "@/types/domain";

export async function createReadingDraftAction(
  input: CreateReadingValues
): Promise<ActionResult<ReadingDetail>> {
  return callRpc<ReadingDetail>("reading.createDraft", input);
}

export async function saveReadingSessionAction(
  input: UpdateReadingSessionValues
): Promise<ActionResult<ReadingDetail>> {
  return callRpc<ReadingDetail>("reading.saveSession", input);
}

export async function deleteReadingAction(
  readingId: string
): Promise<ActionResult<null>> {
  return callRpc<null>("reading.delete", { readingId });
}

export async function recordDeckEventAction(
  input: DeckEventFormValues
): Promise<ActionResult<DeckEvent>> {
  return callRpc<DeckEvent>("reading.recordEvent", input);
}

export async function removeDeckEventAction(
  eventId: string,
  readingId: string
): Promise<ActionResult<null>> {
  return callRpc<null>("reading.removeEvent", { eventId, readingId });
}
