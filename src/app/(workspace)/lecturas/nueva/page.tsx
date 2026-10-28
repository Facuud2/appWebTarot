import type { Metadata } from "next";
import { NewReadingForm } from "@/features/readings/new-reading-form";
import { getAppointmentById } from "@/repositories/appointments-repository";
import { listConsultants } from "@/repositories/consultants-repository";
import {
  listAllCardsIncludingCustom,
  listAvailableDecks,
  listSpreadTemplates,
} from "@/repositories/grimorio-repository";
import { listUserTags } from "@/repositories/tags-repository";
import { BUILTIN_SPREAD_TEMPLATES } from "@/lib/tarot-catalog";
import { requireUser } from "@/server/session";

export const metadata: Metadata = {
  title: "Preparar lectura",
};

export default async function NewReadingPage({
  searchParams,
}: {
  searchParams: Promise<{
    consultantId?: string;
    appointmentId?: string;
    intention?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const consultants = await listConsultants(user.id, { includeArchived: false });
  const decks = await listAvailableDecks(user.id);
  const cardsCatalog = await listAllCardsIncludingCustom(user.id);
  const tagSuggestions = (await listUserTags(user.id)).map((t) => t.name);
  const fetchedSpreads = (await listSpreadTemplates(user.id)).filter(
    (s) => s.isBuiltin
  );
  const classicSpreads =
    fetchedSpreads.length > 0
      ? fetchedSpreads
      : BUILTIN_SPREAD_TEMPLATES.map((b) => ({
          id: b.id,
          userId: null,
          name: b.name,
          category: b.category,
          description: b.description,
          positions: b.positions,
          isBuiltin: true,
          createdAt: "2026-01-01T00:00:00.000Z",
        }));

  const appointment = params.appointmentId
    ? await getAppointmentById(user.id, params.appointmentId)
    : null;

  const resolvedDefaultDeckId =
    user.preferences.defaultDeckId &&
    decks.some((d) => d.id === user.preferences.defaultDeckId)
      ? user.preferences.defaultDeckId
      : (decks.find((d) => d.isDefault)?.id ?? decks[0]?.id ?? "");

  const resolvedDefaultSpreadId =
    user.preferences.defaultSpreadId &&
    classicSpreads.some((s) => s.id === user.preferences.defaultSpreadId)
      ? user.preferences.defaultSpreadId
      : (classicSpreads.find((s) => s.id === "spread-triad-observation")?.id ??
        classicSpreads[0]?.id ??
        "");

  const initialNowIso = new Date().toISOString();

  return (
    <div className="space-y-6">
      <NewReadingForm
        consultants={consultants}
        decks={decks}
        spreads={classicSpreads}
        cardsCatalog={cardsCatalog}
        tagSuggestions={tagSuggestions}
        defaultDeckId={resolvedDefaultDeckId}
        defaultSpreadId={resolvedDefaultSpreadId}
        initialConsultantId={params.consultantId}
        initialAppointment={appointment}
        initialIntention={params.intention}
        initialNowIso={initialNowIso}
      />
    </div>
  );
}
