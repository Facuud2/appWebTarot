"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FilePlus2,
  Filter,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { ConsultantAvatar } from "@/components/shared/consultant-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardCombobox } from "@/components/ui/card-combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PHENOMENON_LABELS, READING_STATUS_LABELS } from "@/lib/constants";
import { cn, formatDateTimeEs } from "@/lib/utils";
import type {
  CanonicalCard,
  Consultant,
  Deck,
  PhenomenonType,
  ReadingSearchFilters,
  ReadingSummary,
  Tag,
} from "@/types/domain";

interface ReadingsArchiveClientProps {
  readings: ReadingSummary[];
  initialFilters: ReadingSearchFilters;
  cards: CanonicalCard[];
  consultants: Consultant[];
  decks: Deck[];
  tags: Tag[];
  compactTables: boolean;
}

const PHENOMENON_FILTER_KEYS: PhenomenonType[] = [
  "jumped",
  "fell_to_floor",
  "base_card",
  "cut_reveal",
  "partially_hidden",
  "spontaneous_turn",
  "out_of_order",
  "other",
];

export function ReadingsArchiveClient({
  readings,
  initialFilters,
  cards,
  consultants,
  decks,
  tags,
  compactTables,
}: ReadingsArchiveClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();

  const [query, setQuery] = React.useState(initialFilters.query ?? "");
  const [status, setStatus] = React.useState<string>(
    initialFilters.status ?? "all"
  );
  const [consultantId, setConsultantId] = React.useState(
    initialFilters.consultantId ?? ""
  );
  const [cardId, setCardId] = React.useState(initialFilters.cardId ?? "");
  const [deckId, setDeckId] = React.useState(initialFilters.deckId ?? "");
  const [phenomenonType, setPhenomenonType] = React.useState<string>(
    initialFilters.phenomenonType ?? ""
  );
  const [tag, setTag] = React.useState(initialFilters.tag ?? "");
  const [dateFrom, setDateFrom] = React.useState(initialFilters.dateFrom ?? "");
  const [dateTo, setDateTo] = React.useState(initialFilters.dateTo ?? "");
  const [showAdvanced, setShowAdvanced] = React.useState<boolean>(() =>
    Boolean(
      initialFilters.cardId ||
        initialFilters.deckId ||
        initialFilters.phenomenonType ||
        initialFilters.tag ||
        initialFilters.dateFrom ||
        initialFilters.dateTo
    )
  );

  const applyUrlFilters = React.useCallback(
    (next: {
      query: string;
      status: string;
      consultantId: string;
      cardId: string;
      deckId: string;
      phenomenonType: string;
      tag: string;
      dateFrom: string;
      dateTo: string;
    }) => {
      const sp = new URLSearchParams();
      if (next.query.trim()) sp.set("q", next.query.trim());
      if (next.status && next.status !== "all") sp.set("status", next.status);
      if (next.consultantId) sp.set("consultantId", next.consultantId);
      if (next.cardId) sp.set("cardId", next.cardId);
      if (next.deckId) sp.set("deckId", next.deckId);
      if (next.phenomenonType) sp.set("phenomenon", next.phenomenonType);
      if (next.tag) sp.set("tag", next.tag);
      if (next.dateFrom) sp.set("from", next.dateFrom);
      if (next.dateTo) sp.set("to", next.dateTo);

      const qs = sp.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router]
  );

  const hasActiveFilters = Boolean(
    query.trim() ||
      (status && status !== "all") ||
      consultantId ||
      cardId ||
      deckId ||
      phenomenonType ||
      tag ||
      dateFrom ||
      dateTo
  );

  const clearAllFilters = () => {
    setQuery("");
    setStatus("all");
    setConsultantId("");
    setCardId("");
    setDeckId("");
    setPhenomenonType("");
    setTag("");
    setDateFrom("");
    setDateTo("");
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Primary Filter Bar */}
      <section
        aria-label="Filtros del archivo de lecturas"
        className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyUrlFilters({
              query,
              status,
              consultantId,
              cardId,
              deckId,
              phenomenonType,
              tag,
              dateFrom,
              dateTo,
            });
          }}
          className="flex flex-col gap-3 lg:flex-row lg:items-center"
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              aria-label="Buscar en títulos, preguntas, observaciones o síntesis"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por pregunta, síntesis, notas de mesa…"
              className="pl-9"
            />
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {/* Status Segmented Filter */}
            <div
              role="group"
              aria-label="Filtrar por estado de lectura"
              className="inline-flex max-w-full overflow-x-auto rounded-lg border border-control bg-raised p-0.5 h-11 sm:h-10"
            >
              {(
                [
                  { id: "all", label: "Todas" },
                  { id: "completed", label: "Completadas" },
                  { id: "draft", label: "Borradores" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setStatus(opt.id);
                    applyUrlFilters({
                      query,
                      status: opt.id,
                      consultantId,
                      cardId,
                      deckId,
                      phenomenonType,
                      tag,
                      dateFrom,
                      dateTo,
                    });
                  }}
                  className={cn(
                    "shrink-0 rounded-md px-2.5 sm:px-3 text-xs font-medium transition-all duration-150 active:scale-95",
                    status === opt.id
                      ? "bg-surface text-ink border border-border shadow-xs"
                      : "text-muted hover:text-ink"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "Filtrando…" : "Buscar"}
            </Button>

            <Button
              type="button"
              variant="tonal"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
            >
              <Filter className="size-4" aria-hidden="true" />
              <span>Filtros cruzados</span>
            </Button>

            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                <span>Limpiar</span>
              </Button>
            ) : null}
          </div>
        </form>

        {/* Cross-dimensional Historical Filter Drawer */}
        {showAdvanced ? (
          <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="filter-consultant">Consultante</Label>
              <select
                id="filter-consultant"
                value={consultantId}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setConsultantId(nextVal);
                  applyUrlFilters({
                    query,
                    status,
                    consultantId: nextVal,
                    cardId,
                    deckId,
                    phenomenonType,
                    tag,
                    dateFrom,
                    dateTo,
                  });
                }}
                className="flex h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink"
              >
                <option value="">Cualquier consultante</option>
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-card">Carta presente en la tirada</Label>
              <CardCombobox
                id="filter-card"
                cards={cards}
                value={cardId}
                onChange={(nextCard) => {
                  setCardId(nextCard);
                  applyUrlFilters({
                    query,
                    status,
                    consultantId,
                    cardId: nextCard,
                    deckId,
                    phenomenonType,
                    tag,
                    dateFrom,
                    dateTo,
                  });
                }}
                placeholder="Cualquier carta…"
                allowClear
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-phenomenon">Evento del mazo</Label>
              <select
                id="filter-phenomenon"
                value={phenomenonType}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setPhenomenonType(nextVal);
                  applyUrlFilters({
                    query,
                    status,
                    consultantId,
                    cardId,
                    deckId,
                    phenomenonType: nextVal,
                    tag,
                    dateFrom,
                    dateTo,
                  });
                }}
                className="flex h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink"
              >
                <option value="">Sin filtro de eventos</option>
                <option value="any_event">
                  Con cualquier evento del mazo
                </option>
                {PHENOMENON_FILTER_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {PHENOMENON_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-deck">Mazo utilizado</Label>
              <select
                id="filter-deck"
                value={deckId}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setDeckId(nextVal);
                  applyUrlFilters({
                    query,
                    status,
                    consultantId,
                    cardId,
                    deckId: nextVal,
                    phenomenonType,
                    tag,
                    dateFrom,
                    dateTo,
                  });
                }}
                className="flex h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink"
              >
                <option value="">Todos los mazos</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-tag">Etiqueta temática</Label>
              <select
                id="filter-tag"
                value={tag}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  setTag(nextVal);
                  applyUrlFilters({
                    query,
                    status,
                    consultantId,
                    cardId,
                    deckId,
                    phenomenonType,
                    tag: nextVal,
                    dateFrom,
                    dateTo,
                  });
                }}
                className="flex h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink"
              >
                <option value="">Todas las etiquetas</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="filter-from">Desde</Label>
                <DatePicker
                  id="filter-from"
                  value={dateFrom}
                  onChange={(nextVal) => {
                    setDateFrom(nextVal);
                    applyUrlFilters({
                      query,
                      status,
                      consultantId,
                      cardId,
                      deckId,
                      phenomenonType,
                      tag,
                      dateFrom: nextVal,
                      dateTo,
                    });
                  }}
                  placeholder="Desde..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filter-to">Hasta</Label>
                <DatePicker
                  id="filter-to"
                  value={dateTo}
                  onChange={(nextVal) => {
                    setDateTo(nextVal);
                    applyUrlFilters({
                      query,
                      status,
                      consultantId,
                      cardId,
                      deckId,
                      phenomenonType,
                      tag,
                      dateFrom,
                      dateTo: nextVal,
                    });
                  }}
                  placeholder="Hasta..."
                />
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Results List */}
      <section aria-label="Listado histórico de lecturas" className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted px-1">
          <span className="num-tabular">
            {readings.length}{" "}
            {readings.length === 1
              ? "lectura encontrada"
              : "lecturas encontradas"}
          </span>
        </div>

        {readings.length === 0 ? (
          <div className="rounded-xl border border-border bg-ground p-8 text-center space-y-3">
            <p className="text-base font-semibold text-ink">
              {hasActiveFilters
                ? "Ninguna lectura coincide con los criterios seleccionados"
                : "Registra tu primera lectura"}
            </p>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              {hasActiveFilters
                ? "Prueba limpiando alguno de los filtros o ampliando el rango de fechas para ver más registros."
                : "Inicia una nueva lectura para registrar la tirada, el contexto del consultante y las cartas sobre la mesa."}
            </p>
            <div className="pt-2">
              {hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={clearAllFilters}>
                  Mostrar todas las lecturas
                </Button>
              ) : (
                <Button asChild variant="primary" size="sm">
                  <Link href="/lecturas/nueva">
                    <FilePlus2 className="size-4" aria-hidden="true" />
                    <span>Registrar primera lectura</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-ground divide-y divide-rule">
            {readings.map((reading) => {
              const deckLabel =
                reading.deckNames.length > 0
                  ? reading.deckNames.join(" + ")
                  : reading.deckName;

              return (
                <article
                  key={reading.id}
                  className={cn(
                    "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between transition-all duration-150 hover:bg-surface/60",
                    compactTables ? "p-3.5 sm:px-5" : "p-4 sm:p-5"
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/lecturas/${reading.id}`}
                        className="text-base font-semibold text-ink hover:text-accent"
                      >
                        {reading.title}
                      </Link>

                      <Badge
                        variant={
                          reading.status === "completed" ? "positive" : "warning"
                        }
                      >
                        {READING_STATUS_LABELS[reading.status]}
                      </Badge>

                      {reading.eventsCount > 0 ? (
                        <Badge variant="phenomenon" className="num-tabular">
                          <Sparkles className="size-3" aria-hidden="true" />
                          <span>
                            {reading.eventsCount}{" "}
                            {reading.eventsCount === 1 ? "evento" : "eventos"}
                          </span>
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
                      {reading.consultantId && reading.consultantDisplayName ? (
                        <Link
                          href={`/consultantes/${reading.consultantId}`}
                          className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-accent"
                        >
                          <ConsultantAvatar
                            name={reading.consultantDisplayName}
                            hue={reading.consultantHue ?? 168}
                            size="sm"
                            className="size-5 text-[10px]"
                          />
                          <span>{reading.consultantDisplayName}</span>
                        </Link>
                      ) : (
                        <span>Lectura personal</span>
                      )}
                      <span>·</span>
                      <span>{reading.spreadName}</span>
                      {deckLabel ? (
                        <>
                          <span>·</span>
                          <span>{deckLabel}</span>
                        </>
                      ) : null}
                      <span>·</span>
                      <span className="num-tabular">
                        {reading.cardsCount} cartas
                      </span>
                    </div>

                    {reading.questionIntention ? (
                      <p className="text-xs text-muted line-clamp-2 max-w-3xl leading-relaxed">
                        {reading.questionIntention}
                      </p>
                    ) : null}

                    {(reading.featuredCards.length > 0 ||
                      reading.tags.length > 0) ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {reading.featuredCards.map((fc, idx) => (
                          <span
                            key={`${reading.id}-${fc.cardId}-${idx}`}
                            className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-xs text-ink"
                          >
                            {fc.romanNumeral ? (
                              <span className="text-muted num-tabular">
                                {fc.romanNumeral}
                              </span>
                            ) : null}
                            <span>{fc.canonicalName}</span>
                            {fc.orientation === "reversed" ? (
                              <span className="text-muted">(Inv.)</span>
                            ) : null}
                          </span>
                        ))}

                        {reading.tags.map((t) => (
                          <Badge key={t.id} variant="neutral">
                            {t.name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <time
                      dateTime={reading.performedAt}
                      suppressHydrationWarning
                      className="text-xs text-muted num-tabular"
                    >
                      {formatDateTimeEs(reading.performedAt)}
                    </time>
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/lecturas/${reading.id}`}>
                        {reading.status === "draft"
                          ? "Continuar lectura"
                          : "Ver ficha"}
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
