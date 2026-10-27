import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewReadingForm } from "@/features/readings/new-reading-form";
import { getAppointmentById } from "@/repositories/appointments-repository";
import { listConsultants } from "@/repositories/consultants-repository";
import {
  listAvailableDecks,
  listSpreadTemplates,
} from "@/repositories/grimorio-repository";
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
  const classicSpreads = (await listSpreadTemplates(user.id)).filter(
    (s) => s.isBuiltin
  );

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
      <div className="space-y-3">
        <Link
          href="/lecturas"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Volver a lecturas</span>
        </Link>

        <header className="space-y-1">
          <h1 className="font-serif text-3xl text-ink">
            Preparar mesa de lectura
          </h1>
          <p className="text-sm text-muted">
            Selecciona tus mazos, la estructura de cartas y el tema de la consulta para abrir la lectura en vivo.
          </p>
        </header>
      </div>

      <NewReadingForm
        consultants={consultants}
        decks={decks}
        spreads={classicSpreads}
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
