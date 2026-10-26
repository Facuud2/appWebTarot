import type { Metadata } from "next";
import { AgendaViewClient } from "@/features/agenda/agenda-view-client";
import { listAppointments } from "@/repositories/appointments-repository";
import { listConsultants } from "@/repositories/consultants-repository";
import { requireUser } from "@/server/session";

export const metadata: Metadata = {
  title: "Agenda de sesiones",
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ nueva?: string; consultantId?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const appointments = listAppointments(user.id, { ascending: true });
  const consultants = listConsultants(user.id, { includeArchived: false });
  const initialNowIso = new Date().toISOString();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl text-ink">Agenda de sesiones</h1>
        <p className="text-sm text-muted">
          Organiza encuentros presenciales o a distancia y abre cada lectura en mesa con su contexto preparado.
        </p>
      </header>

      <AgendaViewClient
        appointments={appointments}
        consultants={consultants}
        autoOpenNew={params.nueva === "1"}
        defaultConsultantId={params.consultantId ?? ""}
        initialNowIso={initialNowIso}
      />
    </div>
  );
}
