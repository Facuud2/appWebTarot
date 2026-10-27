import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, FilePlus2 } from "lucide-react";
import { ConsultantAvatar } from "@/components/shared/consultant-avatar";
import { TarotCardPlate } from "@/components/shared/tarot-card-plate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConsultantDossierActions } from "@/features/consultants/consultant-dossier-actions";
import {
  APPOINTMENT_MODALITY_LABELS,
  APPOINTMENT_STATUS_LABELS,
  READING_STATUS_LABELS,
} from "@/lib/constants";
import { formatDateLongEs, formatDateTimeEs } from "@/lib/utils";
import { getConsultantDetail } from "@/repositories/consultants-repository";
import { listUserTags } from "@/repositories/tags-repository";
import { requireUser } from "@/server/session";

export const metadata: Metadata = {
  title: "Ficha de consultante",
};

export default async function ConsultantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const detail = await getConsultantDetail(user.id, id);
  if (!detail) {
    notFound();
  }

  const { consultant, readings, appointments, frequentCards } = detail;
  const tagSuggestions = (await listUserTags(user.id)).map((t) => t.name);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/consultantes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Volver a consultantes</span>
        </Link>

        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <ConsultantAvatar
              name={consultant.displayName}
              hue={consultant.avatarHue}
              size="lg"
            />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-serif text-3xl text-ink">
                  {consultant.displayName}
                </h1>
                {consultant.archivedAt ? (
                  <Badge variant="warning">Archivado</Badge>
                ) : null}
              </div>

              <p className="text-xs text-muted">
                {consultant.alias && consultant.alias !== consultant.fullName
                  ? `Identificador completo: ${consultant.fullName} · `
                  : ""}
                Registrado desde el {formatDateLongEs(consultant.createdAt)}
              </p>

              {consultant.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {consultant.tags.map((t) => (
                    <Badge key={t.id} variant="neutral">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link
                href={`/agenda?nueva=1&consultantId=${encodeURIComponent(consultant.id)}`}
              >
                <CalendarPlus className="size-3.5" aria-hidden="true" />
                <span>Agendar cita</span>
              </Link>
            </Button>
            <Button asChild size="sm" variant="primary">
              <Link
                href={`/lecturas/nueva?consultantId=${encodeURIComponent(consultant.id)}`}
              >
                <FilePlus2 className="size-3.5" aria-hidden="true" />
                <span>Nueva lectura</span>
              </Link>
            </Button>
            <ConsultantDossierActions
              consultant={consultant}
              tagSuggestions={tagSuggestions}
            />
          </div>
        </header>
      </div>

      {/* Main 8 / 4 Dossier Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="min-w-0 lg:col-span-8 space-y-6">
          {/* Context & Personal Notes */}
          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <h2 className="text-xs font-semibold text-ink">
                Contexto relevante
              </h2>
              <p className="text-sm text-muted leading-relaxed whitespace-pre-line break-words">
                {consultant.contextNotes ||
                  "Sin notas de contexto registradas todavía."}
              </p>
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xs font-semibold text-ink">
                Notas personales de acompañamiento
              </h2>
              <p className="text-sm text-muted leading-relaxed whitespace-pre-line break-words">
                {consultant.personalNotes ||
                  "Sin observaciones particulares de sesión."}
              </p>
            </div>
            {(consultant.email ||
              consultant.phone ||
              consultant.preferredChannel) ? (
              <div className="sm:col-span-2 border-t border-border pt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                {consultant.preferredChannel ? (
                  <span>Modalidad: {consultant.preferredChannel}</span>
                ) : null}
                {consultant.email ? (
                  <span className="break-all sm:break-normal">
                    Correo: {consultant.email}
                  </span>
                ) : null}
                {consultant.phone ? (
                  <span className="num-tabular">
                    Teléfono: {consultant.phone}
                  </span>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* Readings History */}
          <section
            aria-labelledby="heading-historial-lecturas"
            className="rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="heading-historial-lecturas"
                className="text-sm font-semibold text-ink"
              >
                Historial de lecturas ({readings.length})
              </h2>
            </div>

            {readings.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-6 text-center space-y-3">
                <p className="text-sm font-semibold text-ink">
                  Registra la primera lectura de {consultant.displayName}
                </p>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Inicia una lectura vinculada a esta ficha para llevar el registro de sus consultas, cartas clave y evolución.
                </p>
                <Button asChild size="sm" variant="primary">
                  <Link
                    href={`/lecturas/nueva?consultantId=${encodeURIComponent(consultant.id)}`}
                  >
                    Registrar primera lectura
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-rule">
                {readings.map((r) => (
                  <article
                    key={r.id}
                    className="py-4 first:pt-0 last:pb-0 space-y-2"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/lecturas/${r.id}`}
                          className="text-sm font-medium text-ink hover:text-accent"
                        >
                          {r.title}
                        </Link>
                        <Badge
                          variant={
                            r.status === "completed" ? "positive" : "warning"
                          }
                        >
                          {READING_STATUS_LABELS[r.status]}
                        </Badge>
                        {r.eventsCount > 0 ? (
                          <Badge variant="phenomenon" className="num-tabular">
                            {r.eventsCount}{" "}
                            {r.eventsCount === 1 ? "evento" : "eventos"}
                          </Badge>
                        ) : null}
                      </div>
                      <time
                        dateTime={r.performedAt}
                        className="text-xs text-muted num-tabular"
                      >
                        {formatDateTimeEs(r.performedAt)}
                      </time>
                    </div>

                    {r.questionIntention ? (
                      <p className="text-xs text-muted line-clamp-2">
                        Pregunta: {r.questionIntention}
                      </p>
                    ) : null}

                    {r.featuredCards.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {r.featuredCards.map((fc, idx) => (
                          <span
                            key={`${r.id}-${fc.cardId}-${idx}`}
                            className="rounded border border-border bg-surface px-2 py-0.5 text-xs text-ink"
                          >
                            {fc.canonicalName}
                            {fc.orientation === "reversed" ? " (Inv.)" : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Frequent Cards & Appointments */}
        <div className="min-w-0 lg:col-span-4 space-y-6">
          <section className="rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-3.5">
            <h2 className="text-sm font-semibold text-ink">
              Cartas frecuentes en sus sesiones
            </h2>
            {frequentCards.length === 0 ? (
              <p className="text-xs text-muted">
                Al registrar cartas en sus lecturas verás aquí qué cartas reaparecen con mayor frecuencia.
              </p>
            ) : (
              <div className="space-y-2.5">
                {frequentCards.map((item) => (
                  <Link
                    key={item.card.id}
                    href={`/grimorio/${item.card.slug}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-2.5 hover:border-control"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <TarotCardPlate card={item.card} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {item.card.canonicalName}
                        </p>
                        <p className="truncate text-xs text-muted">
                          Ver ficha de la carta →
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-ink num-tabular">
                      {item.count} {item.count === 1 ? "vez" : "veces"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-ground p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">
                Citas vinculadas ({appointments.length})
              </h2>
              <Link
                href={`/agenda?nueva=1&consultantId=${encodeURIComponent(consultant.id)}`}
                className="text-xs text-accent hover:underline"
              >
                + Nueva
              </Link>
            </div>

            {appointments.length === 0 ? (
              <p className="text-xs text-muted">
                No hay sesiones agendadas para este consultante.
              </p>
            ) : (
              <div className="divide-y divide-rule">
                {appointments.map((a) => (
                  <div key={a.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-ink num-tabular">
                        {formatDateTimeEs(a.scheduledAt)}
                      </span>
                      <Badge
                        variant={
                          a.status === "scheduled"
                            ? "warning"
                            : a.status === "completed"
                              ? "positive"
                              : "neutral"
                        }
                      >
                        {APPOINTMENT_STATUS_LABELS[a.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-ink">{a.title}</p>
                    <p className="text-xs text-muted">
                      {APPOINTMENT_MODALITY_LABELS[a.modality]}
                      {a.durationMinutes !== null ? (
                        <>
                          {" "}
                          ·{" "}
                          <span className="num-tabular">
                            {a.durationMinutes} min
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
