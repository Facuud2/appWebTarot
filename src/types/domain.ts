export type ArcanaType = "major" | "minor" | "lenormand" | "astrological";

export type TarotSuit =
  | "wands"
  | "cups"
  | "swords"
  | "pentacles"
  | "disks"
  | "hearts"
  | "diamonds"
  | "clubs"
  | "spades"
  | "zodiac"
  | "planet"
  | "house"
  | "element";

export type CardOrientation = "upright" | "reversed";

export type DeckTradition =
  | "rws"
  | "marseille"
  | "thoth"
  | "lenormand"
  | "living_wheel"
  | "egipcio"
  | "spanish"
  | "visconti"
  | "universal_waite"
  | "modern_witch"
  | "light_seers"
  | "wild_unknown"
  | "osho_zen"
  | "other";

export type ReadingStatus = "draft" | "completed";

export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export type AppointmentModality = "in_person" | "video" | "audio" | "written";

export type DeckPhase =
  | "shuffling"
  | "cutting"
  | "dealing"
  | "base_of_deck"
  | "closing"
  | "other";

export type PhenomenonType =
  | "jumped"
  | "fell_to_floor"
  | "base_card"
  | "cut_reveal"
  | "partially_hidden"
  | "spontaneous_turn"
  | "out_of_order"
  | "other";

export type TagCategory = "general" | "phenomenon" | "theme" | "consultant";

export type TaggableEntityType =
  | "consultant"
  | "reading"
  | "deck_event"
  | "card_entry";

export type ActionResult<T> =
  | {
      ok: true;
      data: T;
      message?: string;
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

export interface UserOnboardingState {
  completed: boolean;
  currentStep: number;
  experienceLevel: "novice" | "intermediate" | "professional" | null;
  usagePurposes: string[];
  selectedDeckId: string | null;
  customDeckCreatedId: string | null;
  skippedAppointmentDemo: boolean;
  createdAppointmentId: string | null;
  skippedReadingDemo: boolean;
  createdReadingId: string | null;
  readingTargetType: "for_me" | "no_consultant" | "consultant" | null;
  targetConsultantId: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface UserPreferences {
  defaultDeckId: string | null;
  defaultSpreadId: string | null;
  compactTables: boolean;
  autosaveReadings: boolean;
  onboarding?: UserOnboardingState;
}

export interface User {
  id: string;
  email: string;
  name: string;
  workspaceName: string;
  isDemo: boolean;
  preferences: UserPreferences;
  createdAt: string;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
  category: TagCategory;
  createdAt: string;
}

export interface Consultant {
  id: string;
  userId: string;
  fullName: string;
  alias: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  preferredChannel: string | null;
  contextNotes: string;
  personalNotes: string;
  avatarHue: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  readingsCount: number;
  upcomingAppointmentsCount: number;
  lastReadingAt: string | null;
  needsSetup: boolean;
}

export interface Deck {
  id: string;
  userId: string | null;
  name: string;
  tradition: DeckTradition;
  author: string | null;
  cardCount: number;
  description: string;
  isDefault: boolean;
  needsSetup: boolean;
  isBuiltin?: boolean;
  createdAt: string;
  readingsCount: number;
}

export interface SpreadPositionDefinition {
  positionIndex: number;
  title: string;
  prompt: string;
  coordX: number;
  coordY: number;
}

export interface SpreadTemplate {
  id: string;
  userId: string | null;
  name: string;
  description: string;
  category: string;
  positions: SpreadPositionDefinition[];
  isBuiltin: boolean;
  createdAt: string;
}

export interface CanonicalCard {
  id: string;
  slug: string;
  arcana: ArcanaType | string;
  suit: TarotSuit | string | null;
  rankNumber: number;
  romanNumeral: string | null;
  canonicalName: string;
  nameEn: string;
  deckTradition: DeckTradition | string;
  searchKeywords: string[];
  traditionalUpright: string;
  traditionalReversed: string;
  traditionalKeywords: string[];
  archetypeNote: string;
}

export interface PersonalCardEntry {
  id: string;
  userId: string;
  cardId: string;
  deckId: string | null;
  customImageUrl: string | null;
  personalMeaning: string;
  reversedMeaning: string;
  symbolsAssociations: string;
  keywords: string[];
  reflections: string;
  tags: Tag[];
  updatedAt: string;
}

export interface CardInterpretationLog {
  id: string;
  userId: string;
  cardId: string;
  deckId: string | null;
  deckName: string | null;
  readingId: string | null;
  readingTitle: string | null;
  noteTitle: string;
  content: string;
  createdAt: string;
}

export interface GrimorioCardSummary {
  card: CanonicalCard;
  personalEntry: PersonalCardEntry | null;
  appearancesCount: number;
  phenomenaCount: number;
  lastAppearedAt: string | null;
}

export interface GrimorioCardDetail {
  card: CanonicalCard;
  personalEntries: PersonalCardEntry[];
  evolutionLog: CardInterpretationLog[];
  appearances: CardReadingAppearance[];
  phenomena: DeckEventWithContext[];
}

export interface CardReadingAppearance {
  readingCardId: string;
  readingId: string;
  readingTitle: string;
  performedAt: string;
  status: ReadingStatus;
  consultantId: string | null;
  consultantDisplayName: string | null;
  deckName: string | null;
  positionIndex: number;
  positionTitle: string;
  orientation: CardOrientation;
  observationNotes: string;
  contextualInterpretation: string;
  personalTakeaway: string;
}

export interface ReadingCardEntry {
  id: string;
  readingId: string;
  positionIndex: number;
  positionTitle: string;
  positionPrompt: string;
  cardId: string;
  card: CanonicalCard;
  orientation: CardOrientation;
  /** Nivel 1: Observación física de lo ocurrido con la carta en mesa */
  observationNotes: string;
  /** Nivel 2: Contexto e interpretación dentro de la sesión */
  contextualInterpretation: string;
  /** Nivel 3: Nota personal para guardar en la biblioteca de cartas */
  personalTakeaway: string;
  syncedToGrimorio: boolean;
  createdAt: string;
}

export interface DeckEvent {
  id: string;
  userId: string;
  readingId: string;
  cardId: string | null;
  card: CanonicalCard | null;
  occurredPhase: DeckPhase;
  phenomenonType: PhenomenonType;
  customPhenomenonLabel: string | null;
  linkedPositionIndex: number | null;
  observationDescription: string;
  personalInterpretation: string;
  occurredAt: string;
  createdAt: string;
  tags: Tag[];
}

export interface DeckEventWithContext extends DeckEvent {
  readingTitle: string;
  readingPerformedAt: string;
  consultantId: string | null;
  consultantDisplayName: string | null;
  deckName: string | null;
}

export interface ReadingSummary {
  id: string;
  userId: string;
  consultantId: string | null;
  consultantDisplayName: string | null;
  consultantHue: number | null;
  appointmentId: string | null;
  deckId: string | null;
  deckName: string | null;
  deckNames: string[];
  spreadTemplateId: string | null;
  spreadName: string;
  title: string;
  questionIntention: string;
  status: ReadingStatus;
  performedAt: string;
  updatedAt: string;
  cardsCount: number;
  eventsCount: number;
  featuredCards: Array<{
    cardId: string;
    canonicalName: string;
    romanNumeral: string | null;
    orientation: CardOrientation;
  }>;
  tags: Tag[];
}

export interface ReadingDetail {
  id: string;
  userId: string;
  consultantId: string | null;
  consultant: Pick<Consultant, "id" | "displayName" | "alias" | "avatarHue"> | null;
  appointmentId: string | null;
  deckId: string | null;
  deckIds: string[];
  deck: Pick<Deck, "id" | "name" | "tradition"> | null;
  decks: Array<Pick<Deck, "id" | "name" | "tradition">>;
  spreadTemplateId: string | null;
  spreadName: string;
  customPositions: SpreadPositionDefinition[];
  title: string;
  questionIntention: string;
  sessionContext: string;
  status: ReadingStatus;
  performedAt: string;
  generalObservations: string;
  sessionSynthesis: string;
  closingReflections: string;
  createdAt: string;
  updatedAt: string;
  cards: ReadingCardEntry[];
  events: DeckEvent[];
  tags: Tag[];
}

export interface Appointment {
  id: string;
  userId: string;
  consultantId: string;
  consultantDisplayName: string;
  consultantHue: number;
  title: string;
  scheduledAt: string;
  durationMinutes: number | null;
  modality: AppointmentModality;
  status: AppointmentStatus;
  intention: string;
  prepNotes: string;
  linkedReadingId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultantDetail {
  consultant: Consultant;
  readings: ReadingSummary[];
  appointments: Appointment[];
  frequentCards: Array<{
    card: CanonicalCard;
    count: number;
    lastSeenAt: string;
  }>;
}

export interface ReadingSearchFilters {
  query?: string;
  status?: ReadingStatus | "all";
  consultantId?: string;
  cardId?: string;
  deckId?: string;
  phenomenonType?: PhenomenonType | "any_event";
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DashboardSnapshot {
  counts: {
    upcomingAppointments: number;
    completedReadings: number;
    draftReadings: number;
    annotatedCards: number;
    activeConsultants: number;
    recordedPhenomena: number;
  };
  incompleteDecks: Deck[];
  incompleteConsultants: Consultant[];
  todayAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  draftReadings: ReadingSummary[];
  recentReadings: ReadingSummary[];
  recentPhenomena: DeckEventWithContext[];
  recentLogs: CardInterpretationLog[];
  recentConsultants: Consultant[];
}

export interface GlobalSearchResult {
  cards: Array<{
    id: string;
    slug: string;
    name: string;
    subtitle: string;
  }>;
  consultants: Array<{
    id: string;
    displayName: string;
    subtitle: string;
  }>;
  readings: Array<{
    id: string;
    title: string;
    performedAt: string;
    status: ReadingStatus;
    consultantName: string | null;
  }>;
}

export interface WorkspaceBackupPayload {
  schemaVersion: 1;
  exportedAt: string;
  workspaceName: string;
  consultants: Array<{
    id: string;
    fullName: string;
    alias: string | null;
    email: string | null;
    phone: string | null;
    preferredChannel: string | null;
    contextNotes: string;
    personalNotes: string;
    avatarHue: number;
    archivedAt: string | null;
    tags: string[];
  }>;
  decks: Array<{
    id: string;
    name: string;
    tradition: DeckTradition;
    author: string | null;
    cardCount: number;
    description: string;
    isDefault: boolean;
  }>;
  cardEntries: Array<{
    cardId: string;
    deckId: string | null;
    customImageUrl: string | null;
    personalMeaning: string;
    reversedMeaning: string;
    symbolsAssociations: string;
    keywords: string[];
    reflections: string;
    tags: string[];
  }>;
  readings: Array<{
    id: string;
    consultantId: string | null;
    deckId: string | null;
    deckIds?: string[];
    spreadTemplateId: string | null;
    spreadName: string;
    customPositions?: SpreadPositionDefinition[];
    title: string;
    questionIntention: string;
    sessionContext: string;
    status: ReadingStatus;
    performedAt: string;
    generalObservations: string;
    sessionSynthesis: string;
    closingReflections: string;
    tags: string[];
    cards: Array<{
      positionIndex: number;
      positionTitle: string;
      positionPrompt: string;
      cardId: string;
      orientation: CardOrientation;
      observationNotes: string;
      contextualInterpretation: string;
      personalTakeaway: string;
    }>;
    events: Array<{
      cardId: string | null;
      occurredPhase: DeckPhase;
      phenomenonType: PhenomenonType;
      customPhenomenonLabel: string | null;
      linkedPositionIndex: number | null;
      observationDescription: string;
      personalInterpretation: string;
      occurredAt: string;
      tags: string[];
    }>;
  }>;
  appointments: Array<{
    id: string;
    consultantId: string;
    title: string;
    scheduledAt: string;
    durationMinutes: number | null;
    modality: AppointmentModality;
    status: AppointmentStatus;
    intention: string;
    prepNotes: string;
  }>;
}
