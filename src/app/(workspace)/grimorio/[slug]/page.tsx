import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { TarotCardPlate } from "@/components/shared/tarot-card-plate";
import { Badge } from "@/components/ui/badge";
import { CardDetailEditor } from "@/features/grimorio/card-detail-editor";
import {
  DECK_PHASE_LABELS,
  ORIENTATION_LABELS,
  PHENOMENON_LABELS,
  SUIT_LABELS,
} from "@/lib/constants";
import { formatDateLongEs, formatDateTimeEs } from "@/lib/utils";
import {
  getGrimorioCardBySlug,
  listCanonicalCards,
  listDecks,
} from "@/repositories/grimorio-repository";
import { listUserTags } from "@/repositories/tags-repository";
import { requireUser } from "@/server/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const allCards = listCanonicalCards();
  const found = allCards.find((c) => c.slug === slug);
  return {
    title: found ? `${found.canonicalName} · Cartas y mazos` : "Ficha de carta",
  };
}

export default async function GrimorioCardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;

  const detail = await getGrimorioCardBySlug(user.id, slug);
  if (!detail) {
    notFound();
  }

  const allCards = listCanonicalCards();
  const currentIdx = allCards.findIndex((c) => c.id === detail.card.id);
  const prevCard = currentIdx > 0 ? allCards[currentIdx - 1] : null;
  const nextCard =
    currentIdx >= 0 && currentIdx < allCards.length - 1
      ? allCards[currentIdx + 1]
      : null;

  const decks = await listDecks(user.id);
  const tagSuggestions = (await listUserTags(user.id)).map((t) => t.name);

  const generalPersonalEntry =
    detail.personalEntries.find((e) => e.deckId === null) ??
    detail.personalEntries[0] ??
    null;

  return (
    <div className="space-y-8">
      {/* Top Navigation & Prev/Next Card */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/grimorio"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Volver a las 78 cartas</span>
        </Link>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {prevCard ? (
            <Link
              href={`/grimorio/${prevCard.slug}`}
              className="inline-flex items-center gap-1 text-muted hover:text-ink"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span>{prevCard.canonicalName}</span>
            </Link>
          ) : null}
          {nextCard ? (
            <Link
              href={`/grimorio/${nextCard.slug}`}
              className="inline-flex items-center gap-1 text-muted hover:text-ink"
            >
              <span>{nextCard.canonicalName}</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Card Editorial Header + Canonical Traditional Reference */}
      <header className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="min-w-0 lg:col-span-4 flex flex-col items-center sm:flex-row lg:flex-col gap-5 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <TarotCardPlate
            card={detail.card}
            customImageUrl={generalPersonalEntry?.customImageUrl}
            size="lg"
          />

          <div className="min-w-0 w-full space-y-3">
            <div>
              <p className="text-xs text-muted num-tabular">
                {detail.card.arcana === "major"
                  ? `Arcano Mayor · ${detail.card.romanNumeral ?? detail.card.rankNumber}`
                  : `Arcano Menor · ${detail.card.suit ? SUIT_LABELS[detail.card.suit] : ""}`}
              </p>
              <h1 className="font-serif text-3xl text-ink">
                {detail.card.canonicalName}
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
              <div>
                <p className="text-muted">En lecturas</p>
                <p className="text-lg font-normal text-ink num-tabular">
                  {detail.appearances.length}
                </p>
              </div>
              <div>
                <p className="text-muted">Eventos del mazo</p>
                <p className="text-lg font-normal text-ink num-tabular">
                  {detail.phenomena.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Read-Only Canonical Reference Box (strictly separated from user notes) */}
        <section
          aria-labelledby="heading-referencia-canonica"
          className="min-w-0 lg:col-span-8 rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="heading-referencia-canonica"
              className="text-sm font-semibold text-ink"
            >
              Significado tradicional de referencia
            </h2>
            <Badge variant="outline">Referencia de solo lectura</Badge>
          </div>

          <p className="text-sm text-ink leading-relaxed">
            {detail.card.archetypeNote}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 border-t border-border pt-4">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-ink">
                Sentido tradicional al derecho
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {detail.card.traditionalUpright}
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-ink">
                Sentido tradicional invertida
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {detail.card.traditionalReversed}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {detail.card.traditionalKeywords.map((kw) => (
              <Badge key={kw} variant="neutral">
                {kw}
              </Badge>
            ))}
          </div>
        </section>
      </header>

      {/* Main Content: Personal Editor + Historical Cross-References */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="min-w-0 lg:col-span-7 space-y-6">
          <CardDetailEditor
            card={detail.card}
            personalEntries={detail.personalEntries}
            decks={decks}
            tagSuggestions={tagSuggestions}
          />
        </div>

        <aside className="min-w-0 lg:col-span-5 space-y-6">
          {/* Evolution of Personal Interpretations Over Time */}
          <section
            aria-labelledby="heading-evolucion"
            className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="heading-evolucion"
                className="text-sm font-semibold text-ink"
              >
                Historial de mis notas ({detail.evolutionLog.length})
              </h2>
              <Clock className="size-4 text-muted" aria-hidden="true" />
            </div>

            {detail.evolutionLog.length === 0 ? (
              <p className="text-xs text-muted leading-relaxed">
                Cada vez que guardes un aprendizaje desde una lectura o marques «Guardar una nota fechada» al editar esta carta, quedará registrado aquí cómo cambian tus notas con el tiempo.
              </p>
            ) : (
              <ol className="space-y-3">
                {detail.evolutionLog.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-lg border border-border bg-ground p-3.5 space-y-1.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-ink">
                        {log.noteTitle}
                      </p>
                      <time
                        dateTime={log.createdAt}
                        className="text-[11px] text-muted num-tabular shrink-0"
                      >
                        {formatDateLongEs(log.createdAt)}
                      </time>
                    </div>
                    <p className="text-xs text-ink leading-relaxed whitespace-pre-line">
                      {log.content}
                    </p>
                    {(log.readingId || log.deckName) ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted">
                        {log.deckName ? <span>Mazo: {log.deckName}</span> : null}
                        {log.readingId ? (
                          <Link
                            href={`/lecturas/${log.readingId}`}
                            className="font-medium text-accent hover:underline"
                          >
                            Surgido en «{log.readingTitle ?? "Lectura"}» →
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Deck Events Involving This Card */}
          <section
            aria-labelledby="heading-fenomenos-carta"
            className="rounded-xl border border-border bg-surface p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="heading-fenomenos-carta"
                className="text-sm font-semibold text-ink"
              >
                Eventos del mazo ({detail.phenomena.length})
              </h2>
              <Sparkles className="size-4 text-accent" aria-hidden="true" />
            </div>

            {detail.phenomena.length === 0 ? (
              <p className="text-xs text-muted leading-relaxed">
                No hay registros de esta carta saltando al mezclar, cayendo o saliendo en el corte.
              </p>
            ) : (
              <div className="space-y-3">
                {detail.phenomena.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-border bg-ground p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="phenomenon">
                        {ev.phenomenonType === "other" &&
                        ev.customPhenomenonLabel
                          ? ev.customPhenomenonLabel
                          : PHENOMENON_LABELS[ev.phenomenonType]}
                      </Badge>
                      <span className="text-[11px] text-muted num-tabular">
                        {formatDateTimeEs(ev.occurredAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {DECK_PHASE_LABELS[ev.occurredPhase]}
                      {ev.deckName ? ` · ${ev.deckName}` : ""}
                    </p>
                    <p className="text-xs text-ink leading-relaxed">
                      {ev.observationDescription}
                    </p>
                    {ev.personalInterpretation.trim() ? (
                      <p className="text-xs text-muted border-t border-border pt-1.5">
                        Significado en la sesión: {ev.personalInterpretation}
                      </p>
                    ) : null}
                    <Link
                      href={`/lecturas/${ev.readingId}`}
                      className="inline-block pt-0.5 text-xs font-medium text-accent hover:underline"
                    >
                      Ver sesión «{ev.readingTitle}» →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Readings Where This Card Appeared */}
          <section
            aria-labelledby="heading-apariciones-carta"
            className="rounded-xl border border-border bg-ground p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="heading-apariciones-carta"
                className="text-sm font-semibold text-ink"
              >
                Apariciones en lecturas ({detail.appearances.length})
              </h2>
              {detail.appearances.length > 0 ? (
                <Link
                  href={`/lecturas?cardId=${encodeURIComponent(detail.card.id)}`}
                  className="text-xs font-medium text-muted hover:text-ink"
                >
                  Filtrar en lecturas
                </Link>
              ) : null}
            </div>

            {detail.appearances.length === 0 ? (
              <p className="text-xs text-muted leading-relaxed">
                Esta carta aún no ha sido registrada en ninguna lectura guardada.
              </p>
            ) : (
              <div className="divide-y divide-rule">
                {detail.appearances.map((app) => (
                  <article
                    key={app.readingCardId}
                    className="py-3.5 first:pt-0 last:pb-0 space-y-1.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <Link
                        href={`/lecturas/${app.readingId}`}
                        className="text-sm font-medium text-ink hover:text-accent truncate"
                      >
                        {app.readingTitle}
                      </Link>
                      <time
                        dateTime={app.performedAt}
                        className="text-[11px] text-muted num-tabular shrink-0"
                      >
                        {formatDateTimeEs(app.performedAt)}
                      </time>
                    </div>

                    <p className="text-xs text-muted">
                      Posición {app.positionIndex}: {app.positionTitle} ·{" "}
                      <span className="text-ink font-medium">
                        {ORIENTATION_LABELS[app.orientation]}
                      </span>
                      {app.consultantDisplayName
                        ? ` · ${app.consultantDisplayName}`
                        : ""}
                    </p>

                    {app.contextualInterpretation.trim() ? (
                      <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                        {app.contextualInterpretation}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
