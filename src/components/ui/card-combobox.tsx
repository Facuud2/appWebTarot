"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DECK_TRADITION_LABELS, SUIT_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CanonicalCard, DeckTradition } from "@/types/domain";

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
  const [open, setOpen] = React.useState(false);
  const listboxId = React.useId();

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

  const renderCardItem = (card: CanonicalCard) => {
    const deckLabel = getDeckLabel(card);
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
        value={searchHaystack}
        onSelect={() => {
          onChange(card.id);
          setOpen(false);
        }}
        className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-ink data-[selected=true]:bg-active transition-colors"
      >
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-2 truncate">
            {card.romanNumeral ? (
              <span className="w-6 shrink-0 text-xs font-semibold text-muted num-tabular">
                {card.romanNumeral}
              </span>
            ) : null}
            <span className="truncate font-medium text-ink">
              {card.canonicalName}
              {card.nameEn &&
              card.nameEn.toLowerCase() !== card.canonicalName.toLowerCase() ? (
                <span className="text-muted font-normal italic">
                  {" "}
                  ({card.nameEn})
                </span>
              ) : null}
              <span className="text-muted font-normal"> — {deckLabel}</span>
            </span>
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
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-label={ariaLabel}
            className={cn(
              "flex h-11 sm:h-10 w-full items-center justify-between gap-2 rounded-lg border border-control bg-raised px-3 text-left text-sm transition-colors hover:bg-surface",
              !selectedCard && "text-faint"
            )}
          >
            <span className="truncate">
              {selectedCard ? (
                <span className="inline-flex items-center gap-1.5 text-ink truncate">
                  {selectedCard.romanNumeral ? (
                    <span className="text-xs font-medium text-muted num-tabular shrink-0">
                      {selectedCard.romanNumeral}
                    </span>
                  ) : null}
                  <span className="font-medium truncate">
                    {selectedCard.canonicalName}
                  </span>
                  <span className="text-xs text-muted font-normal truncate">
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
          className="w-[min(420px,calc(100vw-2rem))] p-0"
          align="start"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <Command
            label="Buscar carta del tarot"
            className="flex flex-col"
            disablePointerSelection
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="size-4 text-muted shrink-0" aria-hidden="true" />
              <Command.Input
                placeholder="Escribe en español o inglés (The Fool, Thoth, Oros...)"
                className="w-full bg-transparent text-sm text-ink placeholder:text-faint outline-none"
              />
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
                maxHeight: "340px",
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

              {customOrOthers.length > 0 ? (
                <Command.Group
                  heading="Cartas del Mazo Personalizado"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
                >
                  {customOrOthers.map(renderCardItem)}
                </Command.Group>
              ) : null}

              {majors.length > 0 ? (
                <Command.Group
                  heading="Arcanos Mayores"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
                >
                  {majors.map(renderCardItem)}
                </Command.Group>
              ) : null}

              {minors.length > 0 ? (
                <Command.Group
                  heading="Arcanos Menores"
                  className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
                >
                  {minors.map(renderCardItem)}
                </Command.Group>
              ) : null}

              {lenormand.length > 0 ? (
                <Command.Group
                  heading="Oráculo Lenormand"
                  className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
                >
                  {lenormand.map(renderCardItem)}
                </Command.Group>
              ) : null}

              {astrological.length > 0 ? (
                <Command.Group
                  heading="The Living Wheel (Astrológico)"
                  className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
                >
                  {astrological.map(renderCardItem)}
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
