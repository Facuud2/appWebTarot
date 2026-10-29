"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { TarotCardPlate } from "@/components/shared/tarot-card-plate";
import { useDeviceEnvironment } from "@/components/providers/device-environment-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DECK_TRADITION_LABELS, SUIT_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CanonicalCard, DeckTradition } from "@/types/domain";

type CardQuickFilter =
  | "all"
  | "major"
  | "wands"
  | "cups"
  | "swords"
  | "pentacles";

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

interface CardComboboxProps {
  cards: CanonicalCard[];
  value: string;
  onChange: (cardId: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  id?: string;
  ariaLabel?: string;
  deckNamesMap?: Record<string, string>;
  customDecks?: Array<{ id: string; name: string }>;
  onRegisterCustomCard?: (deckId: string) => void;
}

export function CardCombobox({
  cards,
  value,
  onChange,
  placeholder = "Seleccionar carta del mazo…",
  allowClear = false,
  id,
  ariaLabel,
  deckNamesMap,
  customDecks,
  onRegisterCustomCard,
}: CardComboboxProps) {
  const { profile } = useDeviceEnvironment();
  const [open, setOpen] = React.useState(false);
  const [quickFilter, setQuickFilter] = React.useState<CardQuickFilter>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const triggerButtonRef = React.useRef<HTMLButtonElement>(null);
  const listboxId = React.useId();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSearchQuery("");
      setTimeout(() => {
        triggerButtonRef.current?.closest(".rounded-xl")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 60);
    }
  };

  const selectedCard = React.useMemo(
    () => cards.find((c) => c.id === value) ?? null,
    [cards, value]
  );

  const getDeckLabel = React.useCallback(
    (card: CanonicalCard): string => {
      if (deckNamesMap && deckNamesMap[card.deckTradition]) {
        return deckNamesMap[card.deckTradition];
      }
      const trad = card.deckTradition as DeckTradition;
      if (DECK_TRADITION_LABELS[trad]) {
        return DECK_TRADITION_LABELS[trad];
      }
      return card.deckTradition || "Tarot";
    },
    [deckNamesMap]
  );

  const majors = React.useMemo(
    () => cards.filter((c) => c.arcana === "major"),
    [cards]
  );
  const minors = React.useMemo(
    () => cards.filter((c) => c.arcana === "minor"),
    [cards]
  );
  const lenormand = React.useMemo(
    () => cards.filter((c) => c.arcana === "lenormand"),
    [cards]
  );
  const astrological = React.useMemo(
    () => cards.filter((c) => c.arcana === "astrological"),
    [cards]
  );
  const customOrOthers = React.useMemo(
    () =>
      cards.filter(
        (c) =>
          c.arcana !== "major" &&
          c.arcana !== "minor" &&
          c.arcana !== "lenormand" &&
          c.arcana !== "astrological"
      ),
    [cards]
  );
  const matchesQuickFilter = React.useCallback(
    (card: CanonicalCard) => {
      if (quickFilter === "all") return true;
      if (quickFilter === "major") return card.arcana === "major";
      return card.suit === quickFilter;
    },
    [quickFilter]
  );
  const matchesSearch = React.useCallback(
    (card: CanonicalCard) => {
      const normalizedQuery = normalizeSearchText(searchQuery);
      if (!normalizedQuery) return true;
      const haystack = [
        card.id,
        card.canonicalName,
        card.nameEn ?? "",
        getDeckLabel(card),
        card.deckTradition ?? "",
        ...(card.searchKeywords ?? []),
        card.romanNumeral ?? "",
        String(card.rankNumber),
        card.suit ? (SUIT_LABELS[card.suit] ?? card.suit) : "",
        ...(card.traditionalKeywords ?? []),
      ].join(" ");
      return normalizeSearchText(haystack).includes(normalizedQuery);
    },
    [getDeckLabel, searchQuery]
  );
  const filterCards = React.useCallback(
    (group: CanonicalCard[]) =>
      group.filter((card) => matchesQuickFilter(card) && matchesSearch(card)),
    [matchesQuickFilter, matchesSearch]
  );
  const visibleCustomOrOthers = filterCards(customOrOthers);
  const visibleMajors = filterCards(majors);
  const visibleMinors = filterCards(minors);
  const visibleLenormand = filterCards(lenormand);
  const visibleAstrological = filterCards(astrological);

  const renderCardItem = (card: CanonicalCard) => {
    const deckLabel = getDeckLabel(card);
    const showNumeral =
      card.romanNumeral &&
      !card.canonicalName.trimStart().startsWith(card.romanNumeral);
    const searchHaystack = [
      card.id,
      card.canonicalName,
      card.nameEn ?? "",
      deckLabel,
      card.deckTradition ?? "",
      ...(card.searchKeywords ?? []),
      card.romanNumeral ?? "",
      String(card.rankNumber),
      card.suit ? (SUIT_LABELS[card.suit] ?? card.suit) : "",
      ...(card.traditionalKeywords ?? []),
    ].join(" ");

    return (
      <Command.Item
        key={card.id}
        value={normalizeSearchText(searchHaystack)}
        onSelect={() => {
          onChange(card.id);
          setOpen(false);
        }}
        className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-ink data-[selected=true]:bg-active transition-colors"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
          <span aria-hidden="true">
            <TarotCardPlate card={card} variant="thumbnail" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-1 truncate font-medium text-ink">
              {showNumeral ? (
                <span className="shrink-0 text-xs font-semibold text-muted num-tabular">
                  {card.romanNumeral}
                </span>
              ) : null}
              <span className="truncate">
                {card.canonicalName}
                {card.nameEn &&
                card.nameEn.toLowerCase() !== card.canonicalName.toLowerCase() ? (
                  <span className="text-muted font-normal italic">
                    {" "}
                    ({card.nameEn})
                  </span>
                ) : null}
              </span>
            </span>
            <span className="truncate text-xs text-muted">{deckLabel}</span>
          </div>
        </div>
        {value === card.id ? (
          <Check
            className="size-4 text-accent shrink-0"
            aria-hidden="true"
          />
        ) : null}
      </Command.Item>
    );
  };

  return (
    <div className="flex items-center gap-1.5 w-full min-w-0 max-w-full">
      <Popover open={open} onOpenChange={handleOpenChange}>
        {open ? (
          <button
            type="button"
            aria-label="Cerrar selector de cartas"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-ink/35 md:hidden"
          />
        ) : null}
        <PopoverTrigger asChild>
          <button
            ref={triggerButtonRef}
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-label={ariaLabel}
            className={cn(
              "flex h-11 sm:h-10 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-lg border border-control bg-raised px-3 text-left text-sm transition-colors hover:bg-surface overflow-hidden",
              !selectedCard && "text-faint"
            )}
          >
            <span className="truncate min-w-0 block flex-1">
              {selectedCard ? (
                <span className="inline-flex items-center gap-1.5 text-ink truncate min-w-0 max-w-full">
                  {selectedCard.romanNumeral &&
                  !selectedCard.canonicalName
                    .trimStart()
                    .startsWith(selectedCard.romanNumeral) ? (
                    <span className="text-xs font-medium text-muted num-tabular shrink-0">
                      {selectedCard.romanNumeral}
                    </span>
                  ) : null}
                  <span className="font-medium truncate min-w-0">
                    {selectedCard.canonicalName}
                  </span>
                  <span className="text-xs text-muted font-normal truncate min-w-0">
                    — {getDeckLabel(selectedCard)}
                  </span>
                </span>
              ) : (
                placeholder
              )}
            </span>
            <ChevronsUpDown
              className="size-4 shrink-0 text-muted"
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="card-picker-mobile-content max-h-[calc(var(--vvh,100dvh)-5.5rem)] w-[min(420px,calc(100vw-2rem))] overflow-hidden bg-ground p-0"
          style={{
            maxHeight: profile.isMobileOrTablet
              ? "calc(var(--vvh, 100dvh) - 5.5rem)"
              : undefined,
          }}
          align="start"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <Command
            label="Buscar carta del tarot"
            className="flex flex-col"
            disablePointerSelection
            shouldFilter={false}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="size-4 text-muted shrink-0" aria-hidden="true" />
              <input
                type="search"
                inputMode="search"
                aria-label="Buscar carta por nombre, símbolo o palabra clave"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Escribe en español o inglés (The Fool, Thoth, Oros...)"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="min-w-0 w-full bg-transparent text-sm text-ink placeholder:text-faint outline-none"
              />
            </div>

            <div
              role="group"
              aria-label="Filtrar cartas por grupo o palo"
              className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {(
                [
                  ["all", "Todos"],
                  ["major", "Mayores"],
                  ["wands", "Bastos"],
                  ["cups", "Copas"],
                  ["swords", "Espadas"],
                  ["pentacles", "Oros / Discos"],
                ] as const
              ).map(([filter, label]) => (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={quickFilter === filter}
                  onClick={() => setQuickFilter(filter)}
                  className={cn(
                    "min-h-9 shrink-0 rounded-md px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    quickFilter === filter
                      ? "bg-ink text-ground"
                      : "bg-surface text-muted hover:text-ink"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom Deck Register Option: FIRST OPTION OF THE SCROLL */}
            {customDecks && customDecks.length > 0 && onRegisterCustomCard ? (
              <div className="p-1.5 border-b border-border bg-accent/5 space-y-1">
                {customDecks.map((cd) => (
                  <button
                    key={cd.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onRegisterCustomCard(cd.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/15 transition-colors cursor-pointer text-left"
                  >
                    <Plus className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>+ Registrar nueva carta en {cd.name}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <Command.List
              id={listboxId}
              className="max-h-80 overflow-y-auto p-1.5 overscroll-contain touch-pan-y"
              style={{
                maxHeight: profile.isMobileOrTablet
                  ? "min(340px, calc(var(--vvh, 100dvh) - 14rem))"
                  : "min(340px, calc(100dvh - 14rem))",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-y",
              }}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <Command.Empty className="px-3 py-4 text-center text-xs text-muted">
                Ninguna carta coincide con la búsqueda.
              </Command.Empty>

              {visibleCustomOrOthers.length > 0 ? (
                <Command.Group
                  heading="Cartas del Mazo Personalizado"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
                >
                  {visibleCustomOrOthers.map(renderCardItem)}
                </Command.Group>
              ) : null}

              {visibleMajors.length > 0 ? (
                <Command.Group
                  heading="Arcanos Mayores"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
                >
                  {visibleMajors.map(renderCardItem)}
                </Command.Group>
              ) : null}

              {visibleMinors.length > 0 ? (
                <Command.Group
                  heading="Arcanos Menores"
                  className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
                >
                  {visibleMinors.map(renderCardItem)}
                </Command.Group>
              ) : null}

              {visibleLenormand.length > 0 ? (
                <Command.Group
                  heading="Oráculo Lenormand"
                  className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
                >
                  {visibleLenormand.map(renderCardItem)}
                </Command.Group>
              ) : null}

              {visibleAstrological.length > 0 ? (
                <Command.Group
                  heading="The Living Wheel (Astrológico)"
                  className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
                >
                  {visibleAstrological.map(renderCardItem)}
                </Command.Group>
              ) : null}
            </Command.List>
          </Command>
        </PopoverContent>
      </Popover>

      {allowClear && selectedCard ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Quitar carta seleccionada"
          className="flex size-10 sm:size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-raised text-muted hover:bg-surface hover:text-ink cursor-pointer"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
