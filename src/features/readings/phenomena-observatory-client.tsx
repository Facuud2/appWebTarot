"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw, Search, Sparkles } from "lucide-react";
import { TarotCardPlate } from "@/components/shared/tarot-card-plate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardCombobox } from "@/components/ui/card-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DECK_PHASE_LABELS, PHENOMENON_LABELS } from "@/lib/constants";
import { formatDateTimeEs } from "@/lib/utils";
import type {
  CanonicalCard,
  DeckEventWithContext,
  DeckPhase,
  PhenomenonType,
  Tag,
} from "@/types/domain";

interface PhenomenaObservatoryClientProps {
  events: DeckEventWithContext[];
  cards: CanonicalCard[];
  tags: Tag[];
}

export function PhenomenaObservatoryClient({
  events,
  cards,
  tags,
}: PhenomenaObservatoryClientProps) {
  const [query, setQuery] = React.useState("");
  const [phenomenonType, setPhenomenonType] = React.useState<string>("all");
  const [phase, setPhase] = React.useState<string>("all");
  const [cardId, setCardId] = React.useState<string>("");
  const [tag, setTag] = React.useState<string>("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((ev) => {
      if (phenomenonType !== "all" && ev.phenomenonType !== phenomenonType) {
        return false;
      }
      if (phase !== "all" && ev.occurredPhase !== phase) {
        return false;
      }
      if (cardId && ev.cardId !== cardId) {
        return false;
      }
      if (
        tag &&
        !ev.tags.some((t) => t.name.toLowerCase() === tag.toLowerCase())
      ) {
        return false;
      }
      if (q) {
        const haystack = [
          ev.observationDescription,
          ev.personalInterpretation,
          ev.customPhenomenonLabel ?? "",
          ev.readingTitle,
          ev.consultantDisplayName ?? "",
          ev.card?.canonicalName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [events, query, phenomenonType, phase, cardId, tag]);

  const hasFilters =
    query.trim().length > 0 ||
    phenomenonType !== "all" ||
    phase !== "all" ||
    cardId.length > 0 ||
    tag.length > 0;

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <section
        aria-label="Filtros de eventos del mazo"
        className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="phenom-search">Buscar en descripciones</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                id="phenom-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cómo cayó, sesión, nota…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phenom-type">Tipo de evento</Label>
            <select
              id="phenom-type"
              value={phenomenonType}
              onChange={(e) => setPhenomenonType(e.target.value)}
              className="flex h-11 sm:h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink"
            >
              <option value="all">Todos los tipos</option>
              {(
                Object.keys(PHENOMENON_LABELS) as PhenomenonType[]
              ).map((k) => (
                <option key={k} value={k}>
                  {PHENOMENON_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phenom-phase">Momento del manejo</Label>
            <select
              id="phenom-phase"
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="flex h-11 sm:h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink"
            >
              <option value="all">Cualquier momento</option>
              {(Object.keys(DECK_PHASE_LABELS) as DeckPhase[]).map((k) => (
                <option key={k} value={k}>
                  {DECK_PHASE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phenom-card">Carta involucrada</Label>
            <CardCombobox
              id="phenom-card"
              cards={cards}
              value={cardId}
              onChange={setCardId}
              placeholder="Cualquier carta…"
              allowClear
            />
          </div>
        </div>

        {(tags.length > 0 || hasFilters) ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">Etiqueta:</span>
              <button
                type="button"
                onClick={() => setTag("")}
                className={`rounded-md px-2 py-0.5 text-xs ${
                  tag === ""
                    ? "bg-active font-medium text-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                Todas
              </button>
              {tags.slice(0, 8).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTag(t.name === tag ? "" : t.name)}
                  className={`rounded-md px-2 py-0.5 text-xs ${
                    tag === t.name
                      ? "bg-active font-medium text-ink"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setPhenomenonType("all");
                  setPhase("all");
                  setCardId("");
                  setTag("");
                }}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                <span>Limpiar filtros</span>
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Chronological Deck Events Feed */}
      <section aria-label="Registros de eventos del mazo" className="space-y-3">
        <p className="text-xs text-muted px-1 num-tabular">
          Mostrando {filtered.length} de {events.length} eventos del mazo
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-ground p-8 text-center space-y-3">
            <Sparkles className="mx-auto size-6 text-accent" aria-hidden="true" />
            <p className="text-base font-semibold text-ink">
              {events.length === 0
                ? "Registra un evento del mazo"
                : "Ningún evento coincide con los filtros activos"}
            </p>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              Durante cualquier lectura puedes pulsar «Registrar evento del mazo» para anotar cartas que saltan al mezclar, caen fuera de la mesa o quedan en la base del corte.
            </p>
            {events.length === 0 ? (
              <div className="pt-2">
                <Button asChild size="sm" variant="primary">
                  <Link href="/lecturas/nueva">Abrir mesa de lectura</Link>
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-ground divide-y divide-rule">
            {filtered.map((ev) => (
              <article
                key={ev.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-start"
              >
                {ev.card ? (
                  <Link
                    href={`/grimorio/${ev.card.slug}`}
                    className="shrink-0 self-start"
                  >
                    <TarotCardPlate card={ev.card} size="sm" />
                  </Link>
                ) : (
                  <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted">
                    <Sparkles className="size-4" aria-hidden="true" />
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="phenomenon">
                        {ev.phenomenonType === "other" &&
                        ev.customPhenomenonLabel
                          ? ev.customPhenomenonLabel
                          : PHENOMENON_LABELS[ev.phenomenonType]}
                      </Badge>
                      <span className="text-xs text-muted">
                        {DECK_PHASE_LABELS[ev.occurredPhase]}
                      </span>
                      {ev.card ? (
                        <Link
                          href={`/grimorio/${ev.card.slug}`}
                          className="text-sm font-semibold text-ink hover:text-accent"
                        >
                          · {ev.card.canonicalName}
                        </Link>
                      ) : null}
                    </div>

                    <time
                      dateTime={ev.occurredAt}
                      suppressHydrationWarning
                      className="text-xs text-muted num-tabular"
                    >
                      {formatDateTimeEs(ev.occurredAt)}
                    </time>
                  </div>

                  {/* Level 1: Factual Observation */}
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-medium text-muted">
                      Qué ocurrió en la mesa
                    </p>
                    <p className="text-sm text-ink leading-relaxed">
                      {ev.observationDescription}
                    </p>
                  </div>

                  {/* Level 2: Optional Personal Meaning */}
                  {ev.personalInterpretation.trim() ? (
                    <div className="rounded-lg border border-border bg-surface p-3 space-y-0.5">
                      <p className="text-[11px] font-medium text-muted">
                        Significado en esa lectura
                      </p>
                      <p className="text-xs text-ink leading-relaxed">
                        {ev.personalInterpretation}
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/lecturas/${ev.readingId}`}
                        className="font-medium text-accent hover:underline"
                      >
                        Sesión: {ev.readingTitle}
                      </Link>
                      {ev.consultantId && ev.consultantDisplayName ? (
                        <>
                          <span>·</span>
                          <Link
                            href={`/consultantes/${ev.consultantId}`}
                            className="hover:text-ink"
                          >
                            {ev.consultantDisplayName}
                          </Link>
                        </>
                      ) : null}
                      {ev.deckName ? <span>· {ev.deckName}</span> : null}
                    </div>

                    {ev.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {ev.tags.map((t) => (
                          <Badge key={t.id} variant="neutral">
                            {t.name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
