import * as React from "react";
import { SUIT_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CanonicalCard, CardOrientation, TarotSuit } from "@/types/domain";

interface TarotCardPlateProps {
  card: CanonicalCard;
  orientation?: CardOrientation;
  customImageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function SuitEmblem({ suit }: { suit: TarotSuit | string | null }) {
  if (suit === "wands") {
    return (
      <svg viewBox="0 0 32 32" className="size-6 stroke-current" fill="none" strokeWidth="1.6" aria-hidden="true">
        <path d="M16 4v24M12 9l4-4 4 4M11 18l5-3M21 15l-5 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (suit === "cups") {
    return (
      <svg viewBox="0 0 32 32" className="size-6 stroke-current" fill="none" strokeWidth="1.6" aria-hidden="true">
        <path d="M9 8h14v5a7 7 0 0 1-14 0V8ZM16 20v6M11 26h10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (suit === "swords") {
    return (
      <svg viewBox="0 0 32 32" className="size-6 stroke-current" fill="none" strokeWidth="1.6" aria-hidden="true">
        <path d="M16 4v22M10 20h12M13 26h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (suit === "pentacles") {
    return (
      <svg viewBox="0 0 32 32" className="size-6 stroke-current" fill="none" strokeWidth="1.6" aria-hidden="true">
        <circle cx="16" cy="16" r="10" />
        <polygon points="16,8 18.4,13.4 24.2,14 19.8,17.8 21,23.5 16,20.4 11,23.5 12.2,17.8 7.8,14 13.6,13.4" strokeLinejoin="round" />
      </svg>
    );
  }
  // Major Arcana bookplate motif
  return (
    <svg viewBox="0 0 32 32" className="size-6 stroke-current" fill="none" strokeWidth="1.5" aria-hidden="true">
      <circle cx="16" cy="16" r="9" />
      <circle cx="16" cy="16" r="3" />
      <path d="M16 4v3M16 25v3M4 16h3M25 16h3" strokeLinecap="round" />
    </svg>
  );
}

export function TarotCardPlate({
  card,
  orientation = "upright",
  customImageUrl,
  size = "md",
  className,
}: TarotCardPlateProps) {
  const isReversed = orientation === "reversed";

  if (size === "sm") {
    return (
      <div
        className={cn(
          "flex h-16 w-11 shrink-0 flex-col items-center justify-between rounded-md border border-border bg-surface p-1.5 text-center select-none",
          isReversed && "border-dashed",
          className
        )}
      >
        <span className="text-[11px] font-medium text-muted num-tabular">
          {card.romanNumeral ?? card.rankNumber}
        </span>
        <div
          className={cn(
            "text-accent transition-transform",
            isReversed && "rotate-180"
          )}
        >
          <SuitEmblem suit={card.suit} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface select-none",
        size === "md" ? "aspect-[2/3] w-32 p-3" : "aspect-[2/3] w-48 p-4",
        className
      )}
    >
      {customImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={customImageUrl}
          alt={`Lámina de ${card.canonicalName}${isReversed ? " (invertida)" : ""}`}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            isReversed && "rotate-180"
          )}
        />
      ) : (
        <div
          className={cn(
            "flex h-full flex-col justify-between rounded-lg border border-border/80 bg-ground p-3",
            isReversed && "rotate-180"
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted num-tabular">
            <span>{card.romanNumeral ?? card.rankNumber}</span>
            <span>
              {card.arcana === "major"
                ? "Arcano"
                : card.suit
                  ? SUIT_LABELS[card.suit]
                  : ""}
            </span>
          </div>

          <div className="my-auto flex flex-col items-center justify-center gap-2 py-2 text-accent">
            <SuitEmblem suit={card.suit} />
          </div>

          <p className="font-serif text-center text-sm leading-tight text-ink">
            {card.canonicalName}
          </p>
        </div>
      )}
    </div>
  );
}
