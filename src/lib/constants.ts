import type {
  AppointmentModality,
  AppointmentStatus,
  CardOrientation,
  DeckPhase,
  DeckTradition,
  PhenomenonType,
  ReadingStatus,
} from "@/types/domain";

export const PHENOMENON_LABELS: Record<PhenomenonType, string> = {
  jumped: "Saltó al mezclar",
  fell_to_floor: "Cayó fuera de la mesa",
  base_card: "Quedó en la base del mazo",
  cut_reveal: "Salió en el corte",
  partially_hidden: "Quedó tapada por otra carta",
  spontaneous_turn: "Se dio vuelta sola",
  out_of_order: "Salió desplazada del orden",
  other: "Otra situación con el mazo",
};

export const DECK_PHASE_LABELS: Record<DeckPhase, string> = {
  shuffling: "Al mezclar",
  cutting: "Al cortar",
  dealing: "Al colocar las cartas",
  base_of_deck: "Fondo del mazo",
  closing: "Al juntar las cartas",
  other: "Otro momento",
};

export const DECK_TRADITION_LABELS: Record<DeckTradition, string> = {
  rws: "Rider-Waite-Smith",
  marseille: "Tarot de Marsella",
  thoth: "Tarot de Thoth (Crowley-Harris)",
  lenormand: "Tarot Lenormand (Petit Lenormand)",
  living_wheel: "The Living Wheel (Astrológico)",
  egipcio: "Tarot Egipcio (Kier)",
  spanish: "Tarot Español (Fournier)",
  visconti: "Visconti-Sforza",
  universal_waite: "Universal Waite / Radiant",
  modern_witch: "Modern Witch Tarot",
  light_seers: "Light Seer's Tarot",
  wild_unknown: "The Wild Unknown",
  osho_zen: "Tarot Osho Zen",
  other: "Otra tradición",
};

export const ORIENTATION_LABELS: Record<CardOrientation, string> = {
  upright: "Derecha",
  reversed: "Invertida",
};

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  draft: "En borrador",
  completed: "Finalizada",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Programada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

export const APPOINTMENT_MODALITY_LABELS: Record<AppointmentModality, string> = {
  in_person: "Presencial",
  video: "Videollamada",
  audio: "Llamada / Audio",
  written: "Por escrito",
};

export const SUIT_LABELS: Record<string, string> = {
  wands: "Bastos",
  cups: "Copas",
  swords: "Espadas",
  pentacles: "Oros",
  disks: "Discos",
  hearts: "Corazones",
  diamonds: "Diamantes",
  clubs: "Tréboles",
  spades: "Picas",
  zodiac: "Signos Zodiacales",
  planet: "Planetas y Luminarias",
  house: "Casas Astrológicas",
  element: "Elementos y Modalidades",
};

export const AVATAR_HUES = [168, 28, 212, 96, 338, 48] as const;
