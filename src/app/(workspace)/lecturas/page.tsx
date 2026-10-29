import type { Metadata } from "next";
import Link from "next/link";
import { Compass, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReadingsArchiveClient } from "@/features/readings/readings-archive-client";
import { listConsultants } from "@/repositories/consultants-repository";
import {
  listAllCardsIncludingCustom,
  listDecks,
} from "@/repositories/grimorio-repository";
import { listReadings } from "@/repositories/readings-repository";
import { listUserTags } from "@/repositories/tags-repository";
import { requireUser } from "@/server/session";
import type {
  PhenomenonType,
  ReadingSearchFilters,
  ReadingStatus,
} from "@/types/domain";

export const metadata: Metadata = {
  title: "Historial de lecturas",
};

const VALID_PHENOMENA = new Set<string>([
  "any_event",
  "jumped",
  "fell_to_floor",
  "base_card",
  "cut_reveal",
  "partially_hidden",
  "spontaneous_turn",
  "out_of_order",
  "other",
]);

export default async function ReadingsArchivePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    consultantId?: string;
    cardId?: string;
    deckId?: string;
    phenomenon?: string;
    tag?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const statusFilter: ReadingStatus | "all" =
    params.status === "draft" || params.status === "completed"
      ? params.status
      : "all";

  const phenomenonFilter =
    params.phenomenon && VALID_PHENOMENA.has(params.phenomenon)
      ? (params.phenomenon as PhenomenonType | "any_event")
      : undefined;

  const filters: ReadingSearchFilters = {
    query: params.q,
    status: statusFilter,
    consultantId: params.consultantId,
    cardId: params.cardId,
    deckId: params.deckId,
    phenomenonType: phenomenonFilter,
    tag: params.tag,
    dateFrom: params.from,
    dateTo: params.to,
  };

  const readings = await listReadings(user.id, filters);
  const cards = await listAllCardsIncludingCustom(user.id);
  const consultants = await listConsultants(user.id, { includeArchived: true });
  const decks = await listDecks(user.id);
  const tags = await listUserTags(user.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl text-ink">Historial de lecturas</h1>
          <p className="text-sm text-muted">
            Consulta tus sesiones guardadas, borradores abiertos, cartas registradas y eventos del mazo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/fenomenos">
              <Compass className="size-4" aria-hidden="true" />
              <span>Eventos del mazo</span>
            </Link>
          </Button>
          <Button asChild variant="primary">
            <Link href="/lecturas/nueva">
              <FilePlus2 className="size-4" aria-hidden="true" />
              <span>Nueva lectura</span>
            </Link>
          </Button>
        </div>
      </header>

      <ReadingsArchiveClient
        readings={readings}
        initialFilters={filters}
        cards={cards}
        consultants={consultants}
        decks={decks}
        tags={tags}
        compactTables={user.preferences.compactTables}
      />
    </div>
  );
}
