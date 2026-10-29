"use client";

import * as React from "react";
import { ArchetypalCardSvg } from "@/components/shared/archetypal-card-svg";
import { useCardImage } from "@/lib/card-image-store";
import { cn } from "@/lib/utils";
import type { CanonicalCard, CardOrientation, TarotSuit } from "@/types/domain";

interface CardArtworkProps {
  card: CanonicalCard;
  orientation?: CardOrientation;
  staticFallbackUrl?: string | null;
  className?: string;
}

interface TarotCardPlateProps {
  card: CanonicalCard;
  orientation?: CardOrientation;
  customImageUrl?: string | null;
  staticFallbackUrl?: string | null;
  size?: "sm" | "md" | "lg";
  variant?: "standard" | "thumbnail";
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

export function getCardShortName(name: string): string {
  return name.replace(/\s*—.*$/, "").replace(/\s*\([^)]*\)$/, "").trim();
}

export function getStaticCardImageUrl(card: CanonicalCard): string {
  const deckSlug = card.deckTradition
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const cardSlug = card.slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `/decks/${deckSlug}/${cardSlug}.webp`;
}

export function CardArtwork({
  card,
  orientation = "upright",
  staticFallbackUrl,
  className,
}: CardArtworkProps) {
  const resolvedStaticUrl = staticFallbackUrl ?? null;
  const { src, isLoading } = useCardImage(
    card.deckTradition,
    card.id,
    resolvedStaticUrl ?? getStaticCardImageUrl(card)
  );
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const imageFailed = Boolean(src && failedSrc === src);

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className
      )}
    >
      <ArchetypalCardSvg
        card={card}
        className={cn(
          "absolute inset-0 h-full w-full object-contain transition-transform duration-300",
          orientation === "reversed" && "rotate-180"
        )}
      />
      {src && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Ilustración de ${card.canonicalName}`}
          loading="lazy"
          decoding="async"
          onError={() => {
            if (src) setFailedSrc(src);
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-contain transition-[opacity,transform] duration-300",
            isLoading && "opacity-0",
            orientation === "reversed" && "rotate-180"
          )}
        />
      ) : null}
    </div>
  );
}

export function TarotCardPlate({
  card,
  orientation = "upright",
  customImageUrl,
  staticFallbackUrl,
  size = "md",
  variant = "standard",
  className,
}: TarotCardPlateProps) {
  const isReversed = orientation === "reversed";

  if (variant === "thumbnail") {
    return (
      <div
        className={cn(
          "relative h-11 w-7 shrink-0 overflow-hidden rounded border border-border bg-ground",
          className
        )}
      >
        <CardArtwork
          card={card}
          orientation={orientation}
          staticFallbackUrl={
            staticFallbackUrl ?? customImageUrl ?? getStaticCardImageUrl(card)
          }
        />
      </div>
    );
  }

  if (size === "sm") {
    return (
      <div
        className={cn(
          "flex h-16 w-11 shrink-0 flex-col items-center justify-between rounded-md border border-border bg-surface p-1.5 text-center select-none transition-[border-color,transform] duration-200 hover:scale-105",
          isReversed && "border-dashed",
          className
        )}
      >
        <span className="text-[11px] font-medium text-muted num-tabular">
          {card.romanNumeral ?? card.rankNumber}
        </span>
        <div
          className={cn(
            "text-accent transition-transform duration-300 ease-out",
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
        "t-tarot-plate relative flex aspect-[3/5] flex-col overflow-hidden rounded-xl border border-border bg-surface select-none shadow-xs transition-[border-color,box-shadow,transform] duration-300",
        size === "md" ? "w-32" : "w-48",
        className
      )}
    >
      <div className="relative min-h-0 flex-[72] overflow-hidden bg-ground">
        <CardArtwork
          card={card}
          orientation={orientation}
          staticFallbackUrl={
            staticFallbackUrl ?? customImageUrl ?? getStaticCardImageUrl(card)
          }
        />
      </div>
      <div className="flex min-h-0 flex-[28] items-center justify-center gap-1 border-t border-border bg-ground px-1.5 py-1 text-center">
        <p className="line-clamp-2 font-serif text-[11px] leading-tight text-ink">
          {getCardShortName(card.canonicalName)}
        </p>
        {isReversed ? (
          <span className="shrink-0 text-[9px] font-medium text-warning">Inv.</span>
        ) : null}
      </div>
    </div>
  );
}
