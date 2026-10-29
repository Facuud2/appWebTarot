import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveReadingWorkbench } from "@/features/readings/live-reading-workbench";
import { listConsultants } from "@/repositories/consultants-repository";
import {
  listAllCardsIncludingCustom,
  listDecks,
  listSpreadTemplates,
} from "@/repositories/grimorio-repository";
import { getReadingDetail } from "@/repositories/readings-repository";
import { listUserTags } from "@/repositories/tags-repository";
import { requireUser } from "@/server/session";

export const metadata: Metadata = {
  title: "Mesa de lectura",
};

export default async function ReadingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const reading = await getReadingDetail(user.id, id);
  if (!reading) {
    notFound();
  }

  const cardsCatalog = await listAllCardsIncludingCustom(user.id);
  const consultants = await listConsultants(user.id, { includeArchived: true });
  const decks = await listDecks(user.id);
  const classicSpreads = (await listSpreadTemplates(user.id)).filter(
    (s) => s.isBuiltin
  );
  const tagSuggestions = (await listUserTags(user.id)).map((t) => t.name);

  return (
    <LiveReadingWorkbench
      initialReading={reading}
      cardsCatalog={cardsCatalog}
      consultants={consultants}
      decks={decks}
      spreads={classicSpreads}
      tagSuggestions={tagSuggestions}
      autosaveEnabled={user.preferences.autosaveReadings}
    />
  );
}
