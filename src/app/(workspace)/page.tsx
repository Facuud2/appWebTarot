import Link from "next/link";
import { ArrowRight, CalendarPlus, FilePlus2, UserPlus } from "lucide-react";
import { ConsultantAvatar } from "@/components/shared/consultant-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  APPOINTMENT_MODALITY_LABELS,
  DECK_PHASE_LABELS,
  PHENOMENON_LABELS,
} from "@/lib/constants";
import {
  formatDateLongEs,
  formatDateTimeEs,
  formatRelativeDayEs,
} from "@/lib/utils";
import { listCanonicalCards } from "@/repositories/grimorio-repository";
import { getDashboardSnapshot } from "@/repositories/readings-repository";
import { requireUser } from "@/server/session";

export default async function HomePage() {
  const user = await requireUser();
  const snapshot = await getDashboardSnapshot(user.id);
  const cards = listCanonicalCards();
  const cardSlugById = new Map(cards.map((c) => [c.id, c]));

  const todayLabel = formatDateLongEs(new Date().toISOString());

  const statusFinding = (() => {
    const parts: string[] = [];
    if (snapshot.todayAppointments.length > 0) {
      parts.push(
        `${snapshot.todayAppointments.length} ${
          snapshot.todayAppointments.length === 1
            ? "sesión agendada hoy"
            : "sesiones agendadas hoy"
        }`
      );
    }
    if (snapshot.counts.draftReadings > 0) {
      parts.push(
        `${snapshot.counts.draftReadings} ${
          snapshot.counts.draftReadings === 1
            ? "lectura pendiente en borrador"
            : "lecturas pendientes en borrador"
        }`
      );
    }
    if (parts.length === 0) {
      return `${todayLabel}. La mesa está despejada para iniciar una nueva sesión o revisar tus cartas.`;
    }
    return `${todayLabel} · Tienes ${parts.join(" y ")}.`;
  })();

  return (
    <div className="space-y-8">
      {/* Editorial Title Row */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="font-serif text-3xl sm:text-4xl leading-tight text-ink">
            {user.workspaceName}
          </h1>
          <p className="text-sm text-muted">{statusFinding}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/agenda?nueva=1">
              <CalendarPlus className="size-4" aria-hidden="true" />
              <span>Agendar cita</span>
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

      {/* Pending Deck Setup Notification */}
      {snapshot.incompleteDecks.length > 0 ? (
        <section
          role="status"
          aria-labelledby="heading-mazos-incompletos"
          className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="warning">Aviso pendiente</Badge>
            <h2
              id="heading-mazos-incompletos"
              className="text-sm font-semibold text-ink"
            >
              {snapshot.incompleteDecks.length === 1
                ? "Tienes un mazo pendiente de modificar y completar"
                : `Tienes ${snapshot.incompleteDecks.length} mazos pendientes de modificar y completar`}
            </h2>
          </div>

          <div className="space-y-2">
            {snapshot.incompleteDecks.map((deck) => (
              <div
                key={deck.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-ground p-3.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-ink truncate">
                    {deck.name}
                  </p>
                  <p className="text-xs text-muted">
                    Registrado rápidamente al abrir una lectura. Modifica este mazo para completar su tradición, número de cartas y descripción.
                  </p>
                </div>
                <Button asChild size="sm" variant="primary" className="shrink-0">
                  <Link
                    href={`/grimorio?tab=mazos&editDeckId=${encodeURIComponent(deck.id)}`}
                  >
                    <span>Completar datos del mazo</span>
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Pending Consultant Setup Notification */}
      {snapshot.incompleteConsultants.length > 0 ? (
        <section
          role="status"
          aria-labelledby="heading-consultantes-incompletos"
          className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="warning">Aviso pendiente</Badge>
            <h2
              id="heading-consultantes-incompletos"
              className="text-sm font-semibold text-ink"
            >
              {snapshot.incompleteConsultants.length === 1
                ? "Tienes un consultante pendiente de completar su información"
                : `Tienes ${snapshot.incompleteConsultants.length} consultantes pendientes de completar su información`}
            </h2>
          </div>

          <div className="space-y-2">
            {snapshot.incompleteConsultants.map((consultant) => (
              <div
                key={consultant.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-ground p-3.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-ink truncate">
                    {consultant.displayName}
                  </p>
                  <p className="text-xs text-muted">
                    Registrado rápidamente al abrir una lectura. Modifica su ficha para completar su contacto, canal preferido y notas de contexto.
                  </p>
                </div>
                <Button asChild size="sm" variant="primary" className="shrink-0">
                  <Link href={`/consultantes/${consultant.id}`}>
                    <span>Completar ficha del consultante</span>
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Row 1: 8 / 4 12-column grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        <div className="min-w-0 lg:col-span-8 space-y-5">
          {/* Pending Drafts Block (only prominent when drafts exist) */}
          {snapshot.draftReadings.length > 0 ? (
            <section
              aria-labelledby="heading-borradores"
              className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <h2
                    id="heading-borradores"
                    className="truncate text-sm font-semibold text-ink"
                  >
                    Lecturas pendientes de cerrar
                  </h2>
                  <Badge variant="warning" className="num-tabular shrink-0">
                    {snapshot.draftReadings.length}
                  </Badge>
                </div>
                <Link
                  href="/lecturas?status=draft"
                  className="shrink-0 text-xs font-medium text-muted hover:text-ink"
                >
                  Ver borradores
                </Link>
              </div>

              <div className="space-y-2">
                {snapshot.draftReadings.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-ground p-3.5"
                  >
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/lecturas/${draft.id}`}
                        className="block line-clamp-2 sm:truncate break-words text-sm font-medium text-ink hover:text-accent"
                      >
                        {draft.title}
                      </Link>
                      <p className="text-xs text-muted line-clamp-2 sm:truncate break-words">
                        {draft.consultantDisplayName ?? "Lectura personal"} ·{" "}
                        {draft.spreadName} · {draft.cardsCount} cartas anotadas
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
                      className="w-full sm:w-auto shrink-0"
                    >
                      <Link href={`/lecturas/${draft.id}`}>
                        <span>Continuar registro</span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Recent Readings Panel */}
          <section
            aria-labelledby="heading-recientes"
            className="min-w-0 rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="heading-recientes"
                className="min-w-0 truncate text-sm font-semibold text-ink"
              >
                Lecturas recientes
              </h2>
              <Link
                href="/lecturas"
                className="shrink-0 text-xs font-medium text-muted hover:text-ink num-tabular"
              >
                Ver todas ({snapshot.counts.completedReadings})
              </Link>
            </div>

            {snapshot.recentReadings.length === 0 ? (
              <div className="rounded-xl border border-border bg-ground p-6 text-center space-y-3">
                <p className="text-sm font-semibold text-ink">
                  Registra tu primera lectura
                </p>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Inicia una sesión para disponer cartas sobre el tapete, registrar el contexto del consultante y guardar notas.
                </p>
                <Button asChild size="sm" variant="primary">
                  <Link href="/lecturas/nueva">Registrar primera lectura</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-rule">
                {snapshot.recentReadings.map((reading) => {
                  const deckLabel =
                    reading.deckNames.length > 0
                      ? reading.deckNames.join(" + ")
                      : reading.deckName;

                  return (
                    <article
                      key={reading.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/lecturas/${reading.id}`}
                            className="break-words text-sm font-medium text-ink hover:text-accent"
                          >
                            {reading.title}
                          </Link>
                          {reading.eventsCount > 0 ? (
                            <Badge variant="phenomenon" className="num-tabular">
                              {reading.eventsCount}{" "}
                              {reading.eventsCount === 1 ? "evento" : "eventos"}
                            </Badge>
                          ) : null}
                        </div>

                        <p className="break-words text-xs text-muted">
                          {reading.consultantDisplayName ?? "Lectura personal"} ·{" "}
                          {reading.spreadName}
                          {deckLabel ? ` · ${deckLabel}` : ""}
                        </p>

                        {reading.featuredCards.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {reading.featuredCards.map((fc, idx) => (
                              <span
                                key={`${reading.id}-${fc.cardId}-${idx}`}
                                className="inline-flex max-w-full items-center gap-1 rounded bg-surface px-2 py-0.5 text-xs text-ink border border-border"
                              >
                                {fc.romanNumeral ? (
                                  <span className="text-muted num-tabular shrink-0">
                                    {fc.romanNumeral}
                                  </span>
                                ) : null}
                                <span className="truncate">{fc.canonicalName}</span>
                                {fc.orientation === "reversed" ? (
                                  <span className="text-muted shrink-0">(Inv.)</span>
                                ) : null}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <time
                        dateTime={reading.performedAt}
                        className="shrink-0 text-xs text-muted num-tabular"
                      >
                        {formatDateTimeEs(reading.performedAt)}
                      </time>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (4 cols): Upcoming Appointments & Recent Consultants */}
        <div className="min-w-0 lg:col-span-4 space-y-5">
          <section
            aria-labelledby="heading-citas"
            className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="heading-citas"
                className="min-w-0 truncate text-sm font-semibold text-ink"
              >
                Próximas sesiones
              </h2>
              <Link
                href="/agenda"
                className="shrink-0 text-xs font-medium text-muted hover:text-ink"
              >
                Abrir agenda
              </Link>
            </div>

            {snapshot.upcomingAppointments.length === 0 ? (
              <div className="rounded-xl border border-border bg-ground p-5 text-center space-y-3">
                <p className="text-sm font-semibold text-ink">
                  Agenda tu próxima sesión
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  Organiza tus citas para preparar el foco previo y abrir la lectura en un solo clic.
                </p>
                <Button asChild size="sm" variant="primary">
                  <Link href="/agenda?nueva=1">Agendar sesión</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {snapshot.upcomingAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="min-w-0 rounded-lg border border-border bg-ground p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        <ConsultantAvatar
                          name={appt.consultantDisplayName}
                          hue={appt.consultantHue}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/consultantes/${appt.consultantId}`}
                            className="block truncate text-sm font-medium text-ink hover:text-accent"
                          >
                            {appt.consultantDisplayName}
                          </Link>
                          <p className="truncate text-xs text-muted">
                            {APPOINTMENT_MODALITY_LABELS[appt.modality]}
                            {appt.durationMinutes !== null ? (
                              <>
                                {" "}
                                ·{" "}
                                <span className="num-tabular">
                                  {appt.durationMinutes} min
                                </span>
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-right text-xs font-medium text-ink num-tabular">
                        {formatRelativeDayEs(appt.scheduledAt)}
                      </span>
                    </div>

                    <p className="break-words text-xs text-muted line-clamp-2">
                      {appt.title}
                    </p>

                    <div className="pt-0.5 flex items-center justify-between gap-2">
                      {appt.linkedReadingId ? (
                        <Link
                          href={`/lecturas/${appt.linkedReadingId}`}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Abrir lectura vinculada →
                        </Link>
                      ) : (
                        <Link
                          href={`/lecturas/nueva?consultantId=${encodeURIComponent(appt.consultantId)}&appointmentId=${encodeURIComponent(appt.id)}&intention=${encodeURIComponent(appt.intention || appt.title)}`}
                          className="text-xs font-medium text-ink hover:text-accent"
                        >
                          Iniciar lectura de esta cita →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            aria-labelledby="heading-consultantes-recientes"
            className="min-w-0 rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="heading-consultantes-recientes"
                className="min-w-0 truncate text-sm font-semibold text-ink"
              >
                Consultantes recientes
              </h2>
              <Link
                href="/consultantes"
                className="shrink-0 text-xs font-medium text-muted hover:text-ink num-tabular"
              >
                Ver todos ({snapshot.counts.activeConsultants})
              </Link>
            </div>

            {snapshot.recentConsultants.length === 0 ? (
              <div className="rounded-xl border border-border bg-ground p-5 text-center space-y-3">
                <p className="text-sm font-semibold text-ink">
                  Registra un consultante
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  Crea fichas de personas para vincular sus lecturas y consultar su historial acumulado.
                </p>
                <Button asChild size="sm" variant="primary">
                  <Link href="/consultantes?nuevo=1">
                    <UserPlus className="size-3.5" aria-hidden="true" />
                    <span>Registrar consultante</span>
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-rule">
                {snapshot.recentConsultants.map((c) => (
                  <Link
                    key={c.id}
                    href={`/consultantes/${c.id}`}
                    className="flex min-w-0 items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-85"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <ConsultantAvatar
                        name={c.displayName}
                        hue={c.avatarHue}
                        size="sm"
                      />
                      <span className="truncate text-sm text-ink">
                        {c.displayName}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted num-tabular">
                      {c.readingsCount}{" "}
                      {c.readingsCount === 1 ? "lectura" : "lecturas"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Row 2: 6 / 6 12-column grid for Deck Events & Card Notes */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        <section
          aria-labelledby="heading-fenomenos-home"
          className="min-w-0 lg:col-span-6 rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="heading-fenomenos-home"
              className="min-w-0 truncate text-sm font-semibold text-ink"
            >
              Eventos recientes del mazo
            </h2>
            <Link
              href="/fenomenos"
              className="shrink-0 text-xs font-medium text-muted hover:text-ink"
            >
              Ver todos
            </Link>
          </div>

          {snapshot.recentPhenomena.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-5 text-center space-y-2.5">
              <p className="text-sm font-semibold text-ink">
                Registra un evento del mazo
              </p>
              <p className="text-xs text-muted leading-relaxed">
                Las cartas que saltan al barajar, caen o quedan en la base de corte se registran durante las lecturas.
              </p>
              <Button asChild size="sm" variant="secondary">
                <Link href="/lecturas/nueva">Abrir mesa de lectura</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-rule">
              {snapshot.recentPhenomena.map((ev) => (
                <div
                  key={ev.id}
                  className="min-w-0 py-3 first:pt-0 last:pb-0 space-y-1"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className="min-w-0 break-words text-sm font-medium text-ink">
                      {ev.card ? ev.card.canonicalName : "Carta sin identificar"}{" "}
                      <span className="font-normal text-muted">
                        ·{" "}
                        {ev.customPhenomenonLabel ||
                          PHENOMENON_LABELS[ev.phenomenonType]}
                      </span>
                    </span>
                    <span className="text-xs text-muted shrink-0">
                      {DECK_PHASE_LABELS[ev.occurredPhase]}
                    </span>
                  </div>
                  <p className="break-words text-xs text-muted line-clamp-2">
                    {ev.observationDescription}
                  </p>
                  <Link
                    href={`/lecturas/${ev.readingId}`}
                    className="inline-block max-w-full truncate text-xs text-accent hover:underline"
                  >
                    En lectura: {ev.readingTitle}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          aria-labelledby="heading-notas-grimorio"
          className="min-w-0 lg:col-span-6 rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="heading-notas-grimorio"
              className="min-w-0 truncate text-sm font-semibold text-ink"
            >
              Últimas notas sobre cartas
            </h2>
            <Link
              href="/grimorio"
              className="shrink-0 text-xs font-medium text-muted hover:text-ink"
            >
              Abrir cartas y mazos
            </Link>
          </div>

          {snapshot.recentLogs.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-5 text-center space-y-2.5">
              <p className="text-sm font-semibold text-ink">
                Escribe tus primeras notas sobre cartas
              </p>
              <p className="text-xs text-muted leading-relaxed">
                Explora las 78 cartas del mazo y anota tus interpretaciones personales o aprendizajes de cada sesión.
              </p>
              <Button asChild size="sm" variant="secondary">
                <Link href="/grimorio">Explorar biblioteca de cartas</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-rule">
              {snapshot.recentLogs.map((log) => {
                const cardObj = cardSlugById.get(log.cardId);
                return (
                  <div
                    key={log.id}
                    className="min-w-0 py-3 first:pt-0 last:pb-0 space-y-1"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                      {cardObj ? (
                        <Link
                          href={`/grimorio/${cardObj.slug}`}
                          className="text-sm font-medium text-ink hover:text-accent"
                        >
                          {cardObj.romanNumeral
                            ? `${cardObj.romanNumeral} · `
                            : ""}
                          {cardObj.canonicalName}
                        </Link>
                      ) : (
                        <span className="break-words text-sm font-medium text-ink">
                          {log.noteTitle}
                        </span>
                      )}
                      <time
                        dateTime={log.createdAt}
                        className="shrink-0 text-xs text-muted num-tabular"
                      >
                        {formatDateTimeEs(log.createdAt)}
                      </time>
                    </div>
                    <p className="break-words text-xs font-medium text-ink/90">
                      {log.noteTitle}
                    </p>
                    <p className="break-words text-xs text-muted line-clamp-2">
                      {log.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
