import type { CSSProperties } from "react";
import type { CanonicalCard } from "@/types/domain";

interface ArchetypalCardSvgProps {
  card: CanonicalCard;
  className?: string;
}

const DECK_PALETTES: Record<string, { ink: string; accent: string; paper: string }> = {
  rws: { ink: "#263f36", accent: "#9b6c3e", paper: "#f1e5c7" },
  marseille: { ink: "#294d73", accent: "#a03e36", paper: "#f2e7c9" },
  thoth: { ink: "#392e4e", accent: "#a05a37", paper: "#ead9b9" },
  lenormand: { ink: "#354b3c", accent: "#8a573c", paper: "#f4e9d2" },
  living_wheel: { ink: "#38465b", accent: "#9b6849", paper: "#eee2ca" },
};

function CardEmblem({ card, accent }: { card: CanonicalCard; accent: string }) {
  if (card.suit === "wands") {
    return (
      <g fill="none" stroke={accent} strokeLinecap="round" strokeWidth="3">
        <path d="M120 144v116M94 165l52 74M146 165l-52 74M83 202h74" />
        <path d="m120 133 9 14-9-5-9 5z" fill={accent} />
        <circle cx="120" cy="202" r="44" strokeDasharray="2 8" />
      </g>
    );
  }
  if (card.suit === "cups" || card.suit === "hearts") {
    return (
      <g fill="none" stroke={accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
        <path d="M82 160h76v26a38 38 0 0 1-76 0v-26Z" />
        <path d="M120 224v36m-24 0h48m-78-90 18 10m108-10-18 10" />
        <path d="M91 175c16 10 42 10 58 0" />
        <circle cx="120" cy="190" r="55" strokeDasharray="2 9" />
      </g>
    );
  }
  if (card.suit === "swords" || card.suit === "spades") {
    return (
      <g fill="none" stroke={accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
        <path d="m120 132 12 60-12 72-12-72 12-60Z" />
        <path d="M91 184h58m-42-13 13 13-13 13m26-26-13 13 13 13M120 264v18m-18 0h36" />
        <circle cx="120" cy="193" r="55" strokeDasharray="2 9" />
      </g>
    );
  }
  if (card.suit === "pentacles" || card.suit === "disks" || card.suit === "diamonds") {
    return (
      <g fill="none" stroke={accent} strokeWidth="3">
        <circle cx="120" cy="193" r="52" />
        <circle cx="120" cy="193" r="39" />
        <path d="m120 151 12 29 31 2-24 19 8 30-27-17-27 17 8-30-24-19 31-2 12-29Z" />
        <circle cx="120" cy="193" r="6" fill={accent} />
      </g>
    );
  }

  const rays = Array.from({ length: 8 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 8;
    const x1 = 120 + Math.cos(angle) * 24;
    const y1 = 193 + Math.sin(angle) * 24;
    const x2 = 120 + Math.cos(angle) * 64;
    const y2 = 193 + Math.sin(angle) * 64;
    return <path key={index} d={`M${x1} ${y1}L${x2} ${y2}`} />;
  });
  return (
    <g fill="none" stroke={accent} strokeLinecap="round" strokeWidth="2.5">
      <circle cx="120" cy="193" r="68" />
      <circle cx="120" cy="193" r="48" />
      {rays}
      <path d="m120 169 8 16 18 8-18 8-8 17-8-17-18-8 18-8 8-16Z" fill={accent} fillOpacity=".16" />
      <circle cx="120" cy="193" r="5" fill={accent} />
    </g>
  );
}

function ElementalGlyph({
  suit,
}: {
  suit: CanonicalCard["suit"];
}) {
  if (suit === "wands") {
    return <path d="M120 277 111 294h18z" />;
  }
  if (suit === "cups" || suit === "hearts") {
    return <path d="M111 277h18l-9 17z" />;
  }
  if (suit === "swords" || suit === "spades") {
    return (
      <>
        <path d="M120 277 111 294h18z" />
        <path d="M113 286h14" />
      </>
    );
  }
  if (suit === "pentacles" || suit === "disks" || suit === "diamonds") {
    return (
      <>
        <path d="M111 277h18l-9 17z" />
        <path d="M113 285h14" />
      </>
    );
  }
  return null;
}

export function ArchetypalCardSvg({ card, className }: ArchetypalCardSvgProps) {
  const palette =
    DECK_PALETTES[card.deckTradition] ?? DECK_PALETTES.rws!;
  const number = card.arcana === "lenormand" ? card.rankNumber : card.romanNumeral ?? card.rankNumber;
  const category =
    card.arcana === "major"
      ? "ARCANO MAYOR"
      : card.arcana === "lenormand"
        ? "LENORMAND"
        : card.arcana === "astrological"
          ? "RUEDA ASTROLÓGICA"
          : "ARCANO MENOR";
  const style: CSSProperties = {
    background: palette.paper,
  };

  return (
    <svg
      viewBox="0 0 240 400"
      className={className}
      style={style}
      role="img"
      aria-label={`Placa arquetípica de ${card.canonicalName}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="7" y="7" width="226" height="386" rx="8" fill={palette.paper} stroke={palette.ink} strokeWidth="2" />
      <rect x="14" y="14" width="212" height="372" rx="5" fill="none" stroke={palette.accent} strokeWidth="1.2" />
      <path d="M25 42h17M25 42v17m190-17h-17m17 0v17M25 358h17m-17 0v-17m190 17h-17m17 0v-17" fill="none" stroke={palette.accent} strokeWidth="2" />
      <text x="120" y="46" textAnchor="middle" fill={palette.ink} fontFamily="serif" fontSize="22">{number}</text>
      <path d="M46 63h148" stroke={palette.accent} strokeWidth="1" />
      <text x="120" y="80" textAnchor="middle" fill={palette.ink} fontFamily="sans-serif" fontSize="8" letterSpacing="2">{category}</text>
      <CardEmblem card={card} accent={palette.accent} />
      <g fill="none" stroke={palette.ink} strokeWidth="1.5" strokeLinejoin="round">
        <ElementalGlyph suit={card.suit} />
      </g>
      <path d="M46 310h148" stroke={palette.accent} strokeWidth="1" />
      <text x="120" y="333" textAnchor="middle" fill={palette.ink} fontFamily="serif" fontSize="12" letterSpacing="2">
        GRIMORIO
      </text>
      <text x="120" y="354" textAnchor="middle" fill={palette.ink} fillOpacity=".72" fontFamily="sans-serif" fontSize="8" letterSpacing="1.5">
        {card.deckTradition.replaceAll("_", " ").toUpperCase()}
      </text>
      <circle cx="31" cy="31" r="3" fill={palette.accent} />
      <circle cx="209" cy="31" r="3" fill={palette.accent} />
      <circle cx="31" cy="369" r="3" fill={palette.accent} />
      <circle cx="209" cy="369" r="3" fill={palette.accent} />
    </svg>
  );
}
