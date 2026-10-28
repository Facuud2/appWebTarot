"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Scissors,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  createQuickDeckAction,
  registerCustomCardAction,
} from "@/actions/grimorio-actions";
import { useUnsavedChanges } from "@/components/providers/unsaved-changes-provider";
import {
  createReadingDraftAction,
  recordDeckEventAction,
  saveReadingSessionAction,
} from "@/actions/reading-actions";
import { SpreadMap } from "@/components/shared/spread-map";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardCombobox } from "@/components/ui/card-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";
import {
  DECK_PHASE_LABELS,
  DECK_TRADITION_LABELS,
  PHENOMENON_LABELS,
} from "@/lib/constants";
import {
  cn,
  formatSessionDateTime,
  toIsoUtcString,
} from "@/lib/utils";
import { appendVoiceTranscript } from "@/lib/voice-normalizer";
import type { ReadingCardInput } from "@/schemas/domain";
import type {
  Appointment,
  CanonicalCard,
  CardOrientation,
  Consultant,
  Deck,
  DeckPhase,
  PhenomenonType,
  SpreadPositionDefinition,
  SpreadTemplate,
} from "@/types/domain";

interface NewReadingFormProps {
  consultants: Consultant[];
  decks: Deck[];
  spreads: SpreadTemplate[];
  cardsCatalog: CanonicalCard[];
  tagSuggestions?: string[];
  defaultDeckId: string;
  defaultSpreadId: string;
  initialConsultantId?: string;
  initialAppointment?: Appointment | null;
  initialIntention?: string;
  initialNowIso?: string;
}

const DEFAULT_CUSTOM_POSITIONS: SpreadPositionDefinition[] = [
  {
    positionIndex: 1,
    title: "",
    prompt: "Situación actual o punto de partida",
    coordX: 25,
    coordY: 50,
  },
  {
    positionIndex: 2,
    title: "",
    prompt: "Desarrollo o aspecto central",
    coordX: 50,
    coordY: 50,
  },
  {
    positionIndex: 3,
    title: "",
    prompt: "Consejo o dirección",
    coordX: 75,
    coordY: 50,
  },
];

interface LocalDeckEvent {
  localId: string;
  positionIndex: number;
  cardId: string;
  occurredPhase: DeckPhase;
  phenomenonType: PhenomenonType;
  customPhenomenonLabel: string;
  observationDescription: string;
  personalInterpretation: string;
  occurredAt: string;
  tags: string[];
}

interface CardSlotData {
  positionIndex: number;
  positionTitle: string;
  positionPrompt: string;
  cardId: string;
  orientation: CardOrientation;
  observationNotes: string;
  contextualInterpretation: string;
  personalTakeaway: string;
  syncToGrimorio: boolean;
  coordX: number;
  coordY: number;
}

function getBalancedGridCoordinates(
  count: number
): Array<{ coordX: number; coordY: number }> {
  const columns = 3;
  const rows = Math.ceil(count / columns);
  const firstY = rows === 2 ? 28 : rows === 3 ? 20 : 14;
  const lastY = 100 - firstY;

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const rowStart = row * columns;
    const cardsInRow = Math.min(columns, count - rowStart);
    const column = index - rowStart;
    const coordX =
      cardsInRow === 1
        ? 50
        : Math.round(20 + (column / (cardsInRow - 1)) * 60);
    const coordY =
      rows === 1
        ? 50
        : Math.round(firstY + (row / (rows - 1)) * (lastY - firstY));

    return { coordX, coordY };
  });
}

function balanceSingleRowPositions(
  positions: SpreadPositionDefinition[]
): SpreadPositionDefinition[] {
  if (
    positions.length < 5 ||
    Math.max(...positions.map((position) => position.coordY)) -
      Math.min(...positions.map((position) => position.coordY)) >
      1
  ) {
    return positions;
  }

  const coordinates = getBalancedGridCoordinates(positions.length);
  return positions.map((position, index) => ({
    ...position,
    ...coordinates[index],
  }));
}

function getSpreadOptionLabel(spread: SpreadTemplate): string {
  const cleanName = spread.name
    .replace(/(?:\s*\(\d+\s+cartas?\))+\s*$/i, "")
    .trim();
  const count = spread.positions.length;
  return `${cleanName} (${count} ${count === 1 ? "carta" : "cartas"})`;
}

// 100% Lucide Icons for Phenomenon Types (Zero emojis)
const PHENOMENON_OPTIONS: Array<{
  type: PhenomenonType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}> = [
  { type: "jumped", label: "Saltó al mezclar", icon: Zap, hint: "Salió despedida" },
  { type: "fell_to_floor", label: "Cayó fuera", icon: ArrowDown, hint: "Al suelo o mesa" },
  { type: "base_card", label: "Base del mazo", icon: Layers, hint: "Carta inferior" },
  { type: "cut_reveal", label: "En el corte", icon: Scissors, hint: "Al partir el mazo" },
  { type: "spontaneous_turn", label: "Se dio vuelta", icon: RotateCw, hint: "Invertida sola" },
  { type: "partially_hidden", label: "Quedó tapada", icon: EyeOff, hint: "Oculta bajo otra" },
  { type: "out_of_order", label: "Fuera de orden", icon: ArrowLeftRight, hint: "Secuencia rota" },
  { type: "other", label: "Otra situación", icon: Sparkles, hint: "Personalizada" },
];

const PHASE_OPTIONS: Array<{ phase: DeckPhase; label: string }> = [
  { phase: "shuffling", label: "Mezclando" },
  { phase: "cutting", label: "Cortando" },
  { phase: "dealing", label: "Repartiendo" },
  { phase: "base_of_deck", label: "Base del mazo" },
  { phase: "closing", label: "Cierre" },
  { phase: "other", label: "Otra fase" },
];

const BUILTIN_TRADITIONS = new Set<string>([
  "rws",
  "marseille",
  "thoth",
  "lenormand",
  "living_wheel",
]);

export function NewReadingForm({
  consultants,
  decks,
  spreads,
  cardsCatalog: initialCardsCatalog,
  tagSuggestions = [],
  defaultDeckId,
  defaultSpreadId,
  initialConsultantId = "",
  initialAppointment = null,
  initialIntention = "",
  initialNowIso,
}: NewReadingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  // Wizard Step: 1 = Configuración, 2 = Cartas y Notas, 3 = Acomodar Mesa
  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3>(1);

  // Dynamic reactive card catalog (including newly registered custom cards)
  const [cardsCatalog, setCardsCatalog] =
    React.useState<CanonicalCard[]>(initialCardsCatalog);

  // Cancel Confirmation Modal State
  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);

  // Unsaved changes protection & Draft tracking
  const { setIsDirty, registerSaveDraftHandler } = useUnsavedChanges();
  const [currentDraftId, setCurrentDraftId] = React.useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);

  // Step 1 State: Decks (persisted reactively to DB), Question, Notes, Consultant, Spread
  const [availableDecks, setAvailableDecks] = React.useState<Deck[]>(decks);
  const [isCreatingDeck, setIsCreatingDeck] = React.useState(false);
  const [selectedDeckIds, setSelectedDeckIds] = React.useState<string[]>(
    defaultDeckId ? [defaultDeckId] : decks[0] ? [decks[0].id] : []
  );
  const [registerNewDeckChecked, setRegisterNewDeckChecked] =
    React.useState(false);
  const [pendingDeckName, setPendingDeckName] = React.useState("");

  const resolvedInitialConsultant =
    initialAppointment?.consultantId || initialConsultantId;
  const [consultantId, setConsultantId] = React.useState(
    resolvedInitialConsultant
  );
  const [isRegisteringNewConsultant, setIsRegisteringNewConsultant] =
    React.useState(false);
  const [quickConsultantName, setQuickConsultantName] = React.useState("");
  const [isQuickConsultantConfirmed, setIsQuickConsultantConfirmed] =
    React.useState(false);

  const resolvedInitialIntention =
    initialIntention ||
    initialAppointment?.intention ||
    initialAppointment?.title ||
    "";
  const [questionIntention, setQuestionIntention] = React.useState(
    resolvedInitialIntention
  );
  const [sessionContext, setSessionContext] = React.useState(
    initialAppointment?.prepNotes ?? ""
  );
  const initialPerformedAt =
    initialAppointment?.scheduledAt ?? initialNowIso ?? new Date().toISOString();
  const [performedAt, setPerformedAt] = React.useState(initialPerformedAt);

  const initialClassicSpread =
    spreads.find((s) => s.id === defaultSpreadId) ?? spreads[0] ?? null;
  const [spreadMode, setSpreadMode] = React.useState<"classic" | "custom">(
    initialClassicSpread ? "classic" : "custom"
  );
  const [spreadTemplateId, setSpreadTemplateId] = React.useState(
    initialClassicSpread?.id ?? ""
  );
  const [spreadName, setSpreadName] = React.useState(
    initialClassicSpread?.name ?? ""
  );

  // Compare against the hydrated appointment values, not the pre-hydration form state.
  const baselineRef = React.useRef({
    appointmentId: initialAppointment?.id ?? "",
    consultantId: resolvedInitialConsultant ?? "",
    questionIntention: resolvedInitialIntention.trim(),
    sessionContext: (initialAppointment?.prepNotes ?? "").trim(),
    performedAt: toIsoUtcString(initialPerformedAt),
    sessionTitle: (initialAppointment?.title ?? "").trim(),
    selectedDeckIds: defaultDeckId
      ? [defaultDeckId]
      : decks[0]
        ? [decks[0].id]
        : [],
    spreadMode: initialClassicSpread ? ("classic" as const) : ("custom" as const),
    spreadTemplateId: initialClassicSpread?.id ?? "",
    customPositions: JSON.stringify(DEFAULT_CUSTOM_POSITIONS),
  });

  // Custom Spread Positions defined in Step 1
  const [customPositions, setCustomPositions] = React.useState<
    SpreadPositionDefinition[]
  >(DEFAULT_CUSTOM_POSITIONS);

  // Step 2 & 3 State: Card Slots Data & Local Events
  const [cardSlots, setCardSlots] = React.useState<CardSlotData[]>([]);
  const [expandedNotesIndex, setExpandedNotesIndex] = React.useState<
    number | null
  >(null);
  const [activeBoardIndex, setActiveBoardIndex] = React.useState<number | null>(
    null
  );

  // Dialog to register a new card in a custom deck
  const [registerCardModal, setRegisterCardModal] = React.useState<{
    deckId: string;
    deckName: string;
    slotIndex: number;
  } | null>(null);
  const [newCardName, setNewCardName] = React.useState("");
  const [isSavingCustomCard, setIsSavingCustomCard] = React.useState(false);

  // Deck Events state (recorded in step 2)
  const [localDeckEvents, setLocalDeckEvents] = React.useState<
    LocalDeckEvent[]
  >([]);
  const [eventModalSlotIndex, setEventModalSlotIndex] = React.useState<
    number | null
  >(null);
  const [modalPhenomenon, setModalPhenomenon] =
    React.useState<PhenomenonType>("jumped");
  const [modalPhase, setModalPhase] = React.useState<DeckPhase>("shuffling");
  const [modalDescription, setModalDescription] = React.useState("");
  const [modalInterpretation, setModalInterpretation] = React.useState("");
  const [modalTags, setModalTags] = React.useState<string[]>([]);

  // Step 3 Synthesis & Tags
  const [sessionTitle, setSessionTitle] = React.useState(
    initialAppointment?.title ?? ""
  );
  const [generalObservations, setGeneralObservations] = React.useState("");
  const [sessionSynthesis, setSessionSynthesis] = React.useState("");
  const [readingTags, setReadingTags] = React.useState<string[]>([]);

  // Selected Spread from classic spreads
  const selectedClassicSpread = React.useMemo(
    () =>
      spreadMode === "classic"
        ? (spreads.find((s) => s.id === spreadTemplateId) ?? spreads[0] ?? null)
        : null,
    [spreads, spreadMode, spreadTemplateId]
  );

  // Deck names mapping
  const deckNamesMap = React.useMemo(() => {
    const map: Record<string, string> = {
      rws: "Rider-Waite-Smith",
      marseille: "Tarot de Marsella",
      thoth: "Tarot de Thoth",
      lenormand: "Lenormand",
      living_wheel: "The Living Wheel",
    };
    for (const d of availableDecks) {
      map[d.id] = d.name;
      if (d.tradition) {
        map[d.tradition] = d.name;
      }
    }
    return map;
  }, [availableDecks]);

  // Active custom decks among chosen decks
  const activeCustomDecks = React.useMemo(() => {
    const activeDecks = availableDecks.filter((d) => selectedDeckIds.includes(d.id));
    const list: Array<{ id: string; name: string }> = [];

    for (const d of activeDecks) {
      if (!BUILTIN_TRADITIONS.has(d.tradition) || d.tradition === "other") {
        list.push({ id: d.id, name: d.name });
      }
    }
    return list;
  }, [availableDecks, selectedDeckIds]);

  // Compute strictly filtered cards based on chosen decks
  const availableFilteredCards = React.useMemo(() => {
    const activeDecks = availableDecks.filter((d) => selectedDeckIds.includes(d.id));
    const selectedTraditions = new Set<string>(
      activeDecks.map((d) => d.tradition)
    );
    const selectedCustomIds = new Set<string>(
      activeCustomDecks.map((d) => d.id)
    );

    const hasBuiltin = Array.from(selectedTraditions).some((t) =>
      BUILTIN_TRADITIONS.has(t)
    );
    const hasCustom = activeCustomDecks.length > 0;

    // Filter cards
    const matching = cardsCatalog.filter((c) => {
      // Check if it belongs to selected builtin traditions
      if (selectedTraditions.has(c.deckTradition)) {
        return true;
      }
      // Check if it belongs to any selected custom deck
      if (selectedCustomIds.has(c.deckTradition)) {
        return true;
      }
      return false;
    });

    // If only custom decks were selected and they have no cards yet, return empty list
    // (DO NOT fallback to RWS! Custom decks should show only their own cards + "Registrar nueva carta")
    if (hasCustom && !hasBuiltin) {
      return matching;
    }

    if (matching.length > 0) {
      return matching;
    }

    // If user selected a builtin deck, filter for that builtin tradition
    if (hasBuiltin) {
      return cardsCatalog.filter((c) => selectedTraditions.has(c.deckTradition));
    }

    return [];
  }, [cardsCatalog, availableDecks, selectedDeckIds, activeCustomDecks]);

  // Deck traditions labels summary
  const selectedDeckTraditionsLabel = React.useMemo(() => {
    const activeDecks = availableDecks.filter((d) => selectedDeckIds.includes(d.id));
    const labels = activeDecks.map((d) => d.name);
    if (labels.length === 0) return "Rider-Waite-Smith";
    return labels.join(", ");
  }, [availableDecks, selectedDeckIds]);

  // Deck toggle in Step 1
  const toggleDeckSelection = (deckId: string, checked: boolean) => {
    setSelectedDeckIds((prev) =>
      checked
        ? Array.from(new Set([...prev, deckId]))
        : prev.filter((id) => id !== deckId)
    );
  };

  // Register deck immediately to DB
  const handleRegisterNewDeck = async () => {
    const clean = pendingDeckName.trim();
    if (!clean) return;
    if (
      availableDecks.some((d) => d.name.toLowerCase() === clean.toLowerCase())
    ) {
      toast.error("Ese nombre de mazo ya está en la lista.");
      return;
    }

    setIsCreatingDeck(true);
    try {
      const res = await createQuickDeckAction(clean);
      if (!res.ok) {
        toast.error(res.error || "No se pudo registrar el mazo.");
        return;
      }
      if (!res.data) {
        toast.error("No se pudo registrar el mazo.");
        return;
      }
      const createdDeck = res.data;
      setAvailableDecks((prev) => [...prev, createdDeck]);
      setSelectedDeckIds((prev) =>
        Array.from(new Set([...prev, createdDeck.id]))
      );
      setPendingDeckName("");
      setRegisterNewDeckChecked(false);
      toast.success(
        `Mazo «${createdDeck.name}» registrado y guardado en la base de datos.`
      );
    } catch (err) {
      console.error(err);
      toast.error("Error al registrar el mazo.");
    } finally {
      setIsCreatingDeck(false);
    }
  };

  // Custom Spread: Position management
  const addCustomPosition = () => {
    if (customPositions.length >= 12) {
      toast.error("La estructura admite un máximo de 12 cartas.");
      return;
    }
    const nextIdx = customPositions.length + 1;
    const newPositions = [
      ...customPositions,
      {
        positionIndex: nextIdx,
        title: "", // Empty so placeholder "Carta X" applies automatically if left empty
        prompt: "",
        coordX: 50,
        coordY: 50,
      },
    ];
    const redistributed = newPositions.map((pos, idx) => ({
      ...pos,
      positionIndex: idx + 1,
      coordX: Math.round(15 + (idx / Math.max(1, newPositions.length - 1)) * 70),
    }));
    setCustomPositions(redistributed);
  };

  const removeCustomPosition = (indexToRemove: number) => {
    if (customPositions.length <= 1) {
      toast.error("La estructura debe tener al menos una posición.");
      return;
    }
    const filtered = customPositions.filter(
      (p) => p.positionIndex !== indexToRemove
    );
    const reindexed = filtered.map((pos, idx) => ({
      ...pos,
      positionIndex: idx + 1,
      coordX:
        filtered.length === 1
          ? 50
          : Math.round(15 + (idx / (filtered.length - 1)) * 70),
    }));
    setCustomPositions(reindexed);
  };

  const updateCustomPositionField = (
    positionIndex: number,
    field: "title" | "prompt",
    value: string
  ) => {
    setCustomPositions((prev) =>
      prev.map((p) =>
        p.positionIndex === positionIndex ? { ...p, [field]: value } : p
      )
    );
  };

  const resetCustomPositions = () => {
    setCustomPositions(DEFAULT_CUSTOM_POSITIONS);
  };

  // Prepare and synchronize cardSlots from Step 1 structure
  const prepareCardSlots = () => {
    let basePositions: SpreadPositionDefinition[] = [];
    if (spreadMode === "custom") {
      basePositions = customPositions.map((p, idx) => ({
        ...p,
        positionIndex: idx + 1,
        title: p.title.trim() || `Carta ${idx + 1}`,
        prompt: p.prompt.trim(),
      }));
      setCustomPositions(basePositions);
    } else if (selectedClassicSpread) {
      basePositions = selectedClassicSpread.positions;
    } else {
      basePositions = DEFAULT_CUSTOM_POSITIONS;
    }

    const initialPositions = balanceSingleRowPositions(basePositions);
    setCardSlots((prevSlots) => {
      return initialPositions.map((pos) => {
        const existing = prevSlots.find(
          (s) => s.positionIndex === pos.positionIndex
        );
        return {
          positionIndex: pos.positionIndex,
          positionTitle: pos.title,
          positionPrompt: pos.prompt,
          cardId: existing?.cardId ?? "",
          orientation: existing?.orientation ?? "upright",
          observationNotes: existing?.observationNotes ?? "",
          contextualInterpretation: existing?.contextualInterpretation ?? "",
          personalTakeaway: existing?.personalTakeaway ?? "",
          syncToGrimorio: existing?.syncToGrimorio ?? false,
          coordX: existing?.coordX ?? pos.coordX,
          coordY: existing?.coordY ?? pos.coordY,
        };
      });
    });
  };

  // Interactive Stepper Navigation (1, 2, 3 buttons)
  const handleNavigateStep = (targetStep: 1 | 2 | 3) => {
    if (targetStep === currentStep) return;

    if (currentStep === 1) {
      if (selectedDeckIds.length === 0) {
        toast.error("Por favor selecciona o añade al menos un mazo.");
        return;
      }
      if (
        isRegisteringNewConsultant &&
        quickConsultantName.trim().length === 0
      ) {
        toast.error("Por favor ingresa el nombre o alias del nuevo consultante.");
        return;
      }
      if (isRegisteringNewConsultant && !isQuickConsultantConfirmed) {
        setIsQuickConsultantConfirmed(true);
      }
      prepareCardSlots();
    }

    setCurrentStep(targetStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep1 = () => {
    handleNavigateStep(2);
  };

  const handleNextStep2 = () => {
    handleNavigateStep(3);
  };

  const handleBackToStep1 = () => {
    handleNavigateStep(1);
  };

  const handleBackToStep2 = () => {
    handleNavigateStep(2);
  };

  // Card slot updater for Step 2
  const updateCardSlot = (
    index: number,
    patch: Partial<CardSlotData>
  ) => {
    setCardSlots((prev) =>
      prev.map((slot) =>
        slot.positionIndex === index ? { ...slot, ...patch } : slot
      )
    );
  };

  // Registering a new card in a custom deck reactively
  const handleOpenRegisterCard = (deckId: string, slotIndex: number) => {
    const deckName = deckNamesMap[deckId] || "Mazo";
    setRegisterCardModal({ deckId, deckName, slotIndex });
    setNewCardName("");
  };

  const handleSaveCustomCard = async () => {
    if (!registerCardModal) return;
    const cleanName = newCardName.trim();
    if (!cleanName) {
      toast.error("Indica el nombre de la nueva carta.");
      return;
    }

    setIsSavingCustomCard(true);
    try {
      const res = await registerCustomCardAction({
        name: cleanName,
        deckId: registerCardModal.deckId,
      });

      if (!res.ok) {
        toast.error(res.error || "No se pudo registrar la carta.");
        return;
      }

      if (!res.data) {
        toast.error("No se pudo registrar la carta.");
        return;
      }

      const createdCard = res.data;
      // 1. Reactively add to cards catalog
      setCardsCatalog((prev) => [...prev, createdCard]);

      // 2. Automatically select for this slot
      updateCardSlot(registerCardModal.slotIndex, { cardId: createdCard.id });

      toast.success(
        `Carta «${createdCard.canonicalName}» registrada y seleccionada.`
      );
      setRegisterCardModal(null);
    } catch (err) {
      console.error(err);
      toast.error("Error al registrar la carta.");
    } finally {
      setIsSavingCustomCard(false);
    }
  };

  // Deck event management for Step 2
  const openDeckEventModal = (positionIndex: number) => {
    setEventModalSlotIndex(positionIndex);
    setModalPhenomenon("jumped");
    setModalPhase("shuffling");
    setModalDescription("");
    setModalInterpretation("");
    setModalTags([]);
  };

  const saveDeckEvent = () => {
    if (!eventModalSlotIndex) return;
    const cleanDesc = modalDescription.trim();
    if (!cleanDesc) {
      toast.error("Por favor describe brevemente qué ocurrió con el mazo.");
      return;
    }
    const slot = cardSlots.find((s) => s.positionIndex === eventModalSlotIndex);
    const newEvent: LocalDeckEvent = {
      localId: `local-ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      positionIndex: eventModalSlotIndex,
      cardId: slot?.cardId || "",
      occurredPhase: modalPhase,
      phenomenonType: modalPhenomenon,
      customPhenomenonLabel: "",
      observationDescription: cleanDesc,
      personalInterpretation: modalInterpretation.trim(),
      occurredAt: new Date().toISOString(),
      tags: modalTags,
    };
    setLocalDeckEvents((prev) => [...prev, newEvent]);
    setEventModalSlotIndex(null);
    toast.success("Evento de mazo registrado.");
  };

  const removeDeckEvent = (localId: string) => {
    setLocalDeckEvents((prev) => prev.filter((ev) => ev.localId !== localId));
    toast.info("Evento removido.");
  };

  // Step 3 Move Card on Board
  const handleMoveBoardCard = (
    positionIndex: number,
    coordX: number,
    coordY: number
  ) => {
    setCardSlots((prev) =>
      prev.map((s) =>
        s.positionIndex === positionIndex ? { ...s, coordX, coordY } : s
      )
    );
  };

  // Quick distribution helpers for Step 3
  const distributeHorizontal = () => {
    const total = cardSlots.length;
    if (total <= 1) return;
    setCardSlots((prev) =>
      total >= 5
        ? prev.map((slot, idx) => ({
            ...slot,
            ...getBalancedGridCoordinates(total)[idx],
          }))
        : prev.map((slot, idx) => ({
            ...slot,
            coordX: Math.round(15 + (idx / (total - 1)) * 70),
            coordY: 50,
          }))
    );
    toast.info(
      total >= 5
        ? "Cartas distribuidas en dos o más filas."
        : "Cartas alineadas horizontalmente."
    );
  };

  const resetToTemplatePositions = () => {
    const templatePositions =
      spreadMode === "custom"
        ? customPositions
        : (selectedClassicSpread?.positions ?? DEFAULT_CUSTOM_POSITIONS);
    const base = balanceSingleRowPositions(templatePositions);

    setCardSlots((prev) =>
      prev.map((slot) => {
        const found = base.find((p) => p.positionIndex === slot.positionIndex);
        return {
          ...slot,
          coordX: found?.coordX ?? 50,
          coordY: found?.coordY ?? 50,
        };
      })
    );
    toast.info("Posiciones restablecidas a la plantilla.");
  };

  // Step 3 Build preview slots for SpreadMap
  const cardByIdMap = React.useMemo(() => {
    return new Map(cardsCatalog.map((c) => [c.id, c]));
  }, [cardsCatalog]);

  const eventPositionIndices = React.useMemo(() => {
    return new Set(localDeckEvents.map((e) => e.positionIndex));
  }, [localDeckEvents]);

  const step3MapSlots = React.useMemo(() => {
    return cardSlots.map((slot) => ({
      positionIndex: slot.positionIndex,
      positionTitle: slot.positionTitle,
      card: slot.cardId ? (cardByIdMap.get(slot.cardId) ?? null) : null,
      orientation: slot.orientation,
      coordX: slot.coordX,
      coordY: slot.coordY,
      hasEvent: eventPositionIndices.has(slot.positionIndex),
      observationNotes: slot.observationNotes,
      contextualInterpretation: slot.contextualInterpretation,
      personalTakeaway: slot.personalTakeaway,
      events: localDeckEvents
        .filter((event) => event.positionIndex === slot.positionIndex)
        .map((event) => ({
          phenomenonType: event.phenomenonType,
          customPhenomenonLabel: event.customPhenomenonLabel,
          occurredPhase: event.occurredPhase,
          observationDescription: event.observationDescription,
          personalInterpretation: event.personalInterpretation,
        })),
    }));
  }, [cardSlots, cardByIdMap, eventPositionIndices, localDeckEvents]);

  // Save Reading Draft
  const handleSaveDraft = React.useCallback(async (): Promise<boolean> => {
    setIsSavingDraft(true);
    try {
      const resolvedTitle =
        sessionTitle.trim() ||
        (questionIntention.trim()
          ? questionIntention.trim().slice(0, 72)
          : `Borrador · ${new Date().toISOString().slice(0, 10)}`);

      let readingId = currentDraftId;

      if (!readingId) {
        const draftRes = await createReadingDraftAction({
          title: resolvedTitle,
          consultantId: isRegisteringNewConsultant
            ? "__new__"
            : consultantId || "",
          appointmentId: initialAppointment?.id ?? "",
          deckIds: selectedDeckIds,
          quickNewDecks: [],
          quickNewConsultant: isRegisteringNewConsultant
            ? quickConsultantName.trim()
            : undefined,
          spreadMode,
          spreadTemplateId: spreadMode === "classic" ? spreadTemplateId : "",
          spreadName:
            spreadMode === "custom"
              ? spreadName.trim() || "Estructura personalizada"
              : (selectedClassicSpread?.name ?? spreadName),
          customPositions: cardSlots.map((s) => ({
            positionIndex: s.positionIndex,
            title: s.positionTitle.trim() || `Carta ${s.positionIndex}`,
            prompt: s.positionPrompt.trim(),
            coordX: s.coordX,
            coordY: s.coordY,
          })),
          questionIntention: questionIntention.trim(),
          sessionContext: sessionContext.trim(),
          performedAt,
        });

        if (!draftRes.ok) {
          toast.error(draftRes.error || "No se pudo crear el borrador.");
          return false;
        }

        if (!draftRes.data) {
          toast.error("No se pudo crear el borrador.");
          return false;
        }

        readingId = draftRes.data.id;
        setCurrentDraftId(readingId);
      }

      // Record deck events
      for (const ev of localDeckEvents) {
        await recordDeckEventAction({
          readingId,
          cardId: ev.cardId,
          occurredPhase: ev.occurredPhase,
          phenomenonType: ev.phenomenonType,
          customPhenomenonLabel: ev.customPhenomenonLabel,
          linkedPositionIndex: ev.positionIndex,
          observationDescription: ev.observationDescription,
          personalInterpretation: ev.personalInterpretation,
          occurredAt: ev.occurredAt,
          tags: ev.tags,
        });
      }

      // Format cards
      const formattedCards: ReadingCardInput[] = cardSlots
        .filter((slot) => slot.cardId && slot.cardId.trim().length > 0)
        .map((slot) => ({
          positionIndex: slot.positionIndex,
          positionTitle:
            slot.positionTitle.trim() || `Carta ${slot.positionIndex}`,
          positionPrompt: slot.positionPrompt.trim(),
          cardId: slot.cardId,
          orientation: slot.orientation,
          observationNotes: slot.observationNotes.trim(),
          contextualInterpretation: slot.contextualInterpretation.trim(),
          personalTakeaway: slot.personalTakeaway.trim(),
          syncToGrimorio: slot.syncToGrimorio,
        }));

      const saveRes = await saveReadingSessionAction({
        readingId,
        title: resolvedTitle,
        consultantId: consultantId || "",
        deckIds: selectedDeckIds,
        spreadTemplateId: spreadMode === "classic" ? spreadTemplateId : "",
        spreadName:
          spreadMode === "custom"
            ? spreadName.trim() || "Estructura personalizada"
            : (selectedClassicSpread?.name ?? spreadName),
        customPositions: cardSlots.map((s) => ({
          positionIndex: s.positionIndex,
          title: s.positionTitle.trim() || `Carta ${s.positionIndex}`,
          prompt: s.positionPrompt.trim(),
          coordX: s.coordX,
          coordY: s.coordY,
        })),
        questionIntention: questionIntention.trim(),
        sessionContext: sessionContext.trim(),
        status: "draft",
        performedAt: toIsoUtcString(performedAt),
        generalObservations: generalObservations.trim(),
        sessionSynthesis: sessionSynthesis.trim(),
        closingReflections: "",
        tags: readingTags,
        cards: formattedCards,
      });

      if (!saveRes.ok) {
        toast.error(saveRes.error || "No se pudo guardar el borrador.");
        return false;
      }

      setIsDirty(false);
      toast.success("Borrador guardado correctamente.");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error al guardar el borrador.");
      return false;
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    currentDraftId,
    sessionTitle,
    questionIntention,
    isRegisteringNewConsultant,
    consultantId,
    initialAppointment,
    selectedDeckIds,
    quickConsultantName,
    spreadMode,
    spreadTemplateId,
    cardSlots,
    spreadName,
    selectedClassicSpread,
    sessionContext,
    performedAt,
    localDeckEvents,
    generalObservations,
    sessionSynthesis,
    readingTags,
    setIsDirty,
  ]);

  // Register draft handler with UnsavedChangesProvider
  React.useEffect(() => {
    registerSaveDraftHandler(handleSaveDraft);
    return () => {
      registerSaveDraftHandler(null);
    };
  }, [handleSaveDraft, registerSaveDraftHandler]);

  // Track dirty state by comparing against initial hydrated baseline
  React.useEffect(() => {
    const isChanged =
      questionIntention.trim() !== baselineRef.current.questionIntention ||
      sessionContext.trim() !== baselineRef.current.sessionContext ||
      (consultantId ?? "") !== baselineRef.current.consultantId ||
      toIsoUtcString(performedAt) !== baselineRef.current.performedAt ||
      sessionTitle.trim() !== baselineRef.current.sessionTitle ||
      selectedDeckIds.join("\u0000") !==
        baselineRef.current.selectedDeckIds.join("\u0000") ||
      spreadMode !== baselineRef.current.spreadMode ||
      (spreadMode === "classic" &&
        spreadTemplateId !== baselineRef.current.spreadTemplateId) ||
      (spreadMode === "custom" &&
        JSON.stringify(customPositions) !== baselineRef.current.customPositions) ||
      isRegisteringNewConsultant ||
      quickConsultantName.trim().length > 0 ||
      cardSlots.some((s) => s.cardId && s.cardId.trim().length > 0) ||
      localDeckEvents.length > 0 ||
      sessionSynthesis.trim().length > 0 ||
      generalObservations.trim().length > 0 ||
      readingTags.length > 0;

    setIsDirty(isChanged);
  }, [
    questionIntention,
    sessionContext,
    consultantId,
    performedAt,
    sessionTitle,
    selectedDeckIds,
    spreadMode,
    spreadTemplateId,
    customPositions,
    isRegisteringNewConsultant,
    quickConsultantName,
    cardSlots,
    localDeckEvents,
    sessionSynthesis,
    generalObservations,
    readingTags,
    setIsDirty,
  ]);

  // Auto-scroll to top smoothly whenever currentStep changes
  React.useEffect(() => {
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  // Final Submit: Save & Complete Reading
  const handleCompleteAndSave = () => {
    startTransition(async () => {
      try {
        const resolvedTitle =
          sessionTitle.trim() ||
          (questionIntention.trim()
            ? questionIntention.trim().slice(0, 72)
            : `Sesión de lectura · ${new Date().toISOString().slice(0, 10)}`);

        let readingId = currentDraftId;

        if (!readingId) {
          const draftRes = await createReadingDraftAction({
            title: resolvedTitle,
            consultantId: isRegisteringNewConsultant
              ? "__new__"
              : consultantId || "",
            appointmentId: initialAppointment?.id ?? "",
            deckIds: selectedDeckIds,
            quickNewDecks: [],
            quickNewConsultant: isRegisteringNewConsultant
              ? quickConsultantName.trim()
              : undefined,
            spreadMode,
            spreadTemplateId: spreadMode === "classic" ? spreadTemplateId : "",
            spreadName:
              spreadMode === "custom"
                ? spreadName.trim() || "Estructura personalizada"
                : (selectedClassicSpread?.name ?? spreadName),
            customPositions: cardSlots.map((s) => ({
              positionIndex: s.positionIndex,
              title: s.positionTitle.trim() || `Carta ${s.positionIndex}`,
              prompt: s.positionPrompt.trim(),
              coordX: s.coordX,
              coordY: s.coordY,
            })),
            questionIntention: questionIntention.trim(),
            sessionContext: sessionContext.trim(),
            performedAt,
          });

          if (!draftRes.ok) {
            toast.error(draftRes.error);
            return;
          }

          if (!draftRes.data) {
            toast.error("No se pudo iniciar la lectura.");
            return;
          }

          readingId = draftRes.data.id;
        }

        // 2. Record all physical deck events
        for (const ev of localDeckEvents) {
          await recordDeckEventAction({
            readingId,
            cardId: ev.cardId,
            occurredPhase: ev.occurredPhase,
            phenomenonType: ev.phenomenonType,
            customPhenomenonLabel: ev.customPhenomenonLabel,
            linkedPositionIndex: ev.positionIndex,
            observationDescription: ev.observationDescription,
            personalInterpretation: ev.personalInterpretation,
            occurredAt: ev.occurredAt,
            tags: ev.tags,
          });
        }

        // 3. Save full reading session with cards & status: "completed"
        const formattedCards: ReadingCardInput[] = cardSlots
          .filter((slot) => slot.cardId && slot.cardId.trim().length > 0)
          .map((slot) => ({
            positionIndex: slot.positionIndex,
            positionTitle:
              slot.positionTitle.trim() || `Carta ${slot.positionIndex}`,
            positionPrompt: slot.positionPrompt.trim(),
            cardId: slot.cardId,
            orientation: slot.orientation,
            observationNotes: slot.observationNotes.trim(),
            contextualInterpretation: slot.contextualInterpretation.trim(),
            personalTakeaway: slot.personalTakeaway.trim(),
            syncToGrimorio: slot.syncToGrimorio,
          }));

        const saveRes = await saveReadingSessionAction({
          readingId,
          title: resolvedTitle,
          consultantId: consultantId || "",
          deckIds: selectedDeckIds,
          spreadTemplateId: spreadMode === "classic" ? spreadTemplateId : "",
          spreadName:
            spreadMode === "custom"
              ? spreadName.trim() || "Estructura personalizada"
              : (selectedClassicSpread?.name ?? spreadName),
          customPositions: cardSlots.map((s) => ({
            positionIndex: s.positionIndex,
            title: s.positionTitle.trim() || `Carta ${s.positionIndex}`,
            prompt: s.positionPrompt.trim(),
            coordX: s.coordX,
            coordY: s.coordY,
          })),
          questionIntention: questionIntention.trim(),
          sessionContext: sessionContext.trim(),
          status: "completed",
          performedAt: toIsoUtcString(performedAt),
          generalObservations: generalObservations.trim(),
          sessionSynthesis: sessionSynthesis.trim(),
          closingReflections: "",
          tags: readingTags,
          cards: formattedCards,
        });

        if (!saveRes.ok) {
          toast.error(
            saveRes.error || "Se creó el borrador pero falló el guardado final."
          );
          router.push(`/lecturas/${readingId}`);
          return;
        }

        setIsDirty(false);
        toast.success("¡Lectura completada y guardada con éxito!");
        router.push(`/lecturas/${readingId}`);
        router.refresh();
      } catch (err) {
        console.error(err);
        toast.error("Ocurrió un error inesperado al guardar la lectura.");
      }
    });
  };

  // Cancel Confirmation Handler
  const handleConfirmCancel = () => {
    setIsDirty(false);
    setIsCancelDialogOpen(false);
    toast.info("Lectura cancelada.");
    router.push("/lecturas");
  };

  return (
    <div className="space-y-6">
      {/* Top Header & 3-Step Pill Stepper (Clickable Buttons) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="space-y-1">
          <Link
            href="/lecturas"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink mb-1"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Volver a lecturas</span>
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl text-ink">
            {currentStep === 1 && "Paso 1: Configuración y Estructura"}
            {currentStep === 2 && "Paso 2: Selección de Cartas y Notas"}
            {currentStep === 3 && "Paso 3: Acomodar Mesa y Completar"}
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            {currentStep === 1 &&
              "Selecciona tus mazos, la pregunta o tema y la estructura de cartas a utilizar."}
            {currentStep === 2 &&
              "Indica las cartas que salieron para cada posición y añade notas o eventos si ocurrieron."}
            {currentStep === 3 &&
              "Acomoda las cartas en el tapete interactivo arrastrándolas con total libertad."}
          </p>
        </div>

        {/* 3-Step Stepper Bar with CLICKABLE Pill Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 self-start sm:self-auto max-w-full">
          <div
            role="group"
            aria-label="Progreso de la lectura"
            className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full border border-border bg-surface p-1 shadow-xs select-none"
          >
            {[
              { id: 1, label: "1. Estructura", title: "Configuración y estructura" },
              { id: 2, label: "2. Cartas", title: "Selección de cartas y notas" },
              { id: 3, label: "3. Mesa", title: "Acomodar mesa y guardar" },
            ].map((step) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleNavigateStep(step.id as 1 | 2 | 3)}
                  title={step.title}
                  className={cn(
                    "flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-3 py-1 text-xs font-medium transition-[color,background-color,transform] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isActive
                      ? "bg-accent text-on-primary font-semibold shadow-xs"
                      : isCompleted
                        ? "text-ink bg-surface-raised hover:bg-surface-raised/80 font-medium"
                        : "text-muted hover:text-ink hover:bg-surface-raised/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4.5 items-center justify-center rounded-full text-[10px]",
                      isActive
                        ? "bg-ground text-ink"
                        : isCompleted
                          ? "bg-accent/20 text-accent font-semibold"
                          : "bg-surface-raised border border-border text-muted"
                    )}
                  >
                    {isCompleted ? <Check className="size-3" /> : step.id}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* Save Draft button */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleSaveDraft()}
            disabled={isSavingDraft || isPending}
            className="h-8 px-2 sm:px-2.5 text-xs text-muted hover:text-ink flex items-center gap-1.5 border-border shrink-0"
            title="Guardar como borrador"
          >
            <Bookmark className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">
              {isSavingDraft ? "Guardando..." : "Guardar borrador"}
            </span>
            <span className="sm:hidden">Borrador</span>
          </Button>

          {/* Cancel button present on all steps */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsCancelDialogOpen(true)}
            className="text-muted hover:text-negative hover:bg-negative/10 h-8 px-2 sm:px-2.5 text-xs shrink-0"
            title="Cancelar lectura"
            aria-label="Cancelar lectura"
          >
            <X className="size-3.5 sm:mr-1 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Cancelar lectura</span>
            <span className="sm:hidden">Salir</span>
          </Button>
        </div>
      </div>

      {/* Linked Appointment notice if present */}
      {initialAppointment ? (
        <div className="rounded-lg border border-border bg-ground p-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="break-words text-xs font-medium text-ink">
              Vinculada a cita: {initialAppointment.title}
            </p>
            <p className="text-xs text-muted">
              Horario pactado: {formatSessionDateTime(initialAppointment.scheduledAt)}
            </p>
            <p className="text-xs text-muted">
              Al completar la lectura en el paso 3, el estado de la cita pasará automáticamente a Realizada.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                setPerformedAt(toIsoUtcString(initialAppointment.scheduledAt))
              }
              className="h-8 text-xs"
            >
              Usar horario de la cita
            </Button>
            <Badge variant="positive">Cita conectada</Badge>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* PASO 1: Configuración, Mazos, Pregunta, Notas & Estructura                 */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="min-w-0 lg:col-span-7 space-y-6 rounded-xl border border-border bg-surface p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="step1-consultant">Consultante</Label>
                  {!isRegisteringNewConsultant ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisteringNewConsultant(true);
                        setConsultantId("__new__");
                        setIsQuickConsultantConfirmed(false);
                      }}
                      className="text-xs text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="size-3" aria-hidden="true" />
                      <span>Nuevo consultante</span>
                    </button>
                  ) : null}
                </div>
                <select
                  id="step1-consultant"
                  className="flex h-11 sm:h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink transition-colors focus-visible:border-ink"
                  value={isRegisteringNewConsultant ? "__new__" : (consultantId || "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__new__") {
                      setIsRegisteringNewConsultant(true);
                      setConsultantId("__new__");
                      setIsQuickConsultantConfirmed(false);
                    } else {
                      setIsRegisteringNewConsultant(false);
                      setQuickConsultantName("");
                      setIsQuickConsultantConfirmed(false);
                      setConsultantId(val);
                    }
                  }}
                >
                  <option value="">Lectura personal / Sin consultante</option>
                  {consultants.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                      {c.alias && c.alias !== c.fullName ? ` (${c.fullName})` : ""}
                    </option>
                  ))}
                  <option value="__new__">
                    {quickConsultantName.trim()
                      ? `Nuevo consultante: ${quickConsultantName.trim()}`
                      : "+ Registrar nuevo consultante…"}
                  </option>
                </select>

                {isRegisteringNewConsultant ? (
                  <div className="mt-2 space-y-2 rounded-lg border border-accent/40 bg-accent/5 p-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-2">
                      <Label
                        htmlFor="quick-new-consultant-name"
                        className="text-xs font-medium text-accent"
                      >
                        Nombre o alias del nuevo consultante
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisteringNewConsultant(false);
                          setQuickConsultantName("");
                          setIsQuickConsultantConfirmed(false);
                          setConsultantId("");
                        }}
                        className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 cursor-pointer"
                      >
                        <X className="size-3" aria-hidden="true" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="quick-new-consultant-name"
                        value={quickConsultantName}
                        onChange={(e) => {
                          setQuickConsultantName(e.target.value);
                          setIsQuickConsultantConfirmed(false);
                        }}
                        placeholder="Escribe el nombre o alias (ej. Sofía Méndez)…"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!quickConsultantName.trim()}
                        onClick={() => setIsQuickConsultantConfirmed(true)}
                        className="h-10 shrink-0"
                      >
                        Añadir
                      </Button>
                    </div>
                    {isQuickConsultantConfirmed && quickConsultantName.trim() ? (
                      <p aria-live="polite" className="text-xs text-accent">
                        Se registrará a {quickConsultantName.trim()} al iniciar la lectura.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="step1-performed-at">Fecha y hora</Label>
                <DateTimePicker
                  id="step1-performed-at"
                  value={performedAt}
                  onChange={(val) => setPerformedAt(val)}
                />
              </div>
            </div>

            {/* Mazos a utilizar */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <Label>Mazos a utilizar</Label>
                <span className="text-xs text-muted">
                  Puedes elegir uno o varios mazos
                </span>
              </div>

              <div className="divide-y divide-rule rounded-xl border border-border bg-ground">
                {availableDecks.map((d) => {
                  const checked = selectedDeckIds.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      htmlFor={`select-deck-${d.id}`}
                      className={cn(
                        "flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer transition-colors hover:bg-surface/70",
                        checked && "bg-surface/90"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          id={`select-deck-${d.id}`}
                          checked={checked}
                          onCheckedChange={(val) =>
                            toggleDeckSelection(d.id, val === true)
                          }
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">
                            {d.name}
                          </p>
                          <p className="text-xs text-muted truncate">
                            {DECK_TRADITION_LABELS[d.tradition] || d.tradition}
                          </p>
                        </div>
                      </div>
                      {d.needsSetup ? (
                        <Badge variant="warning">Faltan datos</Badge>
                      ) : null}
                    </label>
                  );
                })}

                {/* Option to quickly register a new deck */}
                <div className="px-3.5 py-2.5 space-y-3">
                  <label
                    htmlFor="select-deck-register-new"
                    className="flex items-center gap-2.5 cursor-pointer select-none"
                  >
                    <Checkbox
                      id="select-deck-register-new"
                      checked={registerNewDeckChecked}
                      onCheckedChange={(val) =>
                        setRegisterNewDeckChecked(val === true)
                      }
                    />
                    <span className="text-sm font-medium text-accent">
                      Registrar mazo nuevo
                    </span>
                  </label>

                  {registerNewDeckChecked ? (
                    <div className="space-y-2 pl-6">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          id="step1-quick-new-deck-name"
                          value={pendingDeckName}
                          onChange={(e) => setPendingDeckName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleRegisterNewDeck();
                            }
                          }}
                          placeholder="Escribe el nombre del mazo (ej. Tarot Egipcio)…"
                          disabled={isCreatingDeck}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleRegisterNewDeck}
                          disabled={isCreatingDeck}
                          className="shrink-0"
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          <span>
                            {isCreatingDeck ? "Guardando…" : "Añadir mazo"}
                          </span>
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted">
                        El mazo se guardará automáticamente en tu biblioteca de mazos.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Estructura de cartas en la mesa */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="step1-spread-select">
                  Estructura de cartas a utilizar
                </Label>
                <select
                  id="step1-spread-select"
                  value={spreadMode === "custom" ? "custom" : spreadTemplateId}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "custom") {
                      setSpreadMode("custom");
                      setSpreadName("");
                    } else {
                      setSpreadMode("classic");
                      setSpreadTemplateId(val);
                      const found = spreads.find((s) => s.id === val);
                      if (found) setSpreadName(found.name);
                    }
                  }}
                  className="flex h-11 sm:h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink transition-colors focus-visible:border-ink"
                >
                  {spreads.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {getSpreadOptionLabel(sp)}
                    </option>
                  ))}
                  <option value="custom">Estructura personalizada</option>
                </select>
              </div>

              {spreadMode === "custom" ? (
                <div className="space-y-4 rounded-xl border border-accent/30 bg-accent/5 p-4 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    <Label htmlFor="step1-custom-spread-name">
                      Nombre de la estructura personalizada{" "}
                      <span className="text-muted font-normal">(opcional)</span>
                    </Label>
                    <Input
                      id="step1-custom-spread-name"
                      value={spreadName}
                      onChange={(e) => setSpreadName(e.target.value)}
                      placeholder="Ej. Tirada de espejo, Estrella de 6 puntas…"
                    />
                  </div>

                  {/* Campos para agregar el significado de cada carta */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-ink">
                          Significados de cada posición ({customPositions.length})
                        </h4>
                        <p className="text-[11px] text-muted">
                          Si dejas los campos vacíos, automáticamente se nombrarán «Carta 1», «Carta 2», etc.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={addCustomPosition}
                          disabled={customPositions.length >= 12}
                          className="h-7 px-2 text-xs"
                        >
                          <Plus className="size-3 mr-1" aria-hidden="true" />
                          <span>Añadir carta</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCustomPosition(customPositions.length)}
                          disabled={customPositions.length <= 1}
                          className="h-7 px-2 text-xs text-muted hover:text-ink"
                        >
                          <Minus className="size-3 mr-1" aria-hidden="true" />
                          <span>Quitar última</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={resetCustomPositions}
                          className="h-7 px-2 text-xs text-muted hover:text-ink"
                          title="Restablecer a 3 cartas"
                        >
                          <RotateCcw className="size-3" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {customPositions.map((pos) => (
                        <div
                          key={pos.positionIndex}
                          className="rounded-lg border border-border bg-surface p-3 space-y-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="inline-flex size-5 items-center justify-center rounded-full bg-ground border border-border text-[11px] font-medium text-ink shrink-0 num-tabular">
                              {pos.positionIndex}
                            </span>
                            <Input
                              value={pos.title}
                              onChange={(e) =>
                                updateCustomPositionField(
                                  pos.positionIndex,
                                  "title",
                                  e.target.value
                                )
                              }
                              placeholder={`Carta ${pos.positionIndex}`}
                              className="h-8 text-xs font-medium"
                            />
                            {customPositions.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removeCustomPosition(pos.positionIndex)}
                                aria-label={`Quitar posición ${pos.positionIndex}`}
                                className="text-muted hover:text-negative shrink-0 p-1 cursor-pointer"
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                              </button>
                            ) : null}
                          </div>
                          <Input
                            value={pos.prompt}
                            onChange={(e) =>
                              updateCustomPositionField(
                                pos.positionIndex,
                                "prompt",
                                e.target.value
                              )
                            }
                            placeholder="Significado o enfoque de esta carta (ej. Pasado, Bloqueo, Consejo)…"
                            className="h-8 text-xs text-muted placeholder:text-muted/60"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Pregunta o tema de la consulta */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="step1-intention">
                  Pregunta o tema de la consulta
                </Label>
                <VoiceMicButton
                  fieldLabel="pregunta o tema de la consulta"
                  onTranscript={(chunk) =>
                    setQuestionIntention((current) =>
                      appendVoiceTranscript(current, chunk)
                    )
                  }
                />
              </div>
              <Textarea
                id="step1-intention"
                rows={3}
                value={questionIntention}
                onChange={(e) => setQuestionIntention(e.target.value)}
                placeholder="¿Qué desea consultar la persona o qué quieres revisar en esta lectura?"
              />
            </div>

            {/* Notas previas / contexto */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="step1-context">
                  Notas previas / Contexto{" "}
                  <span className="text-muted font-normal">(opcional)</span>
                </Label>
                <VoiceMicButton
                  fieldLabel="notas previas y contexto"
                  onTranscript={(chunk) =>
                    setSessionContext((current) =>
                      appendVoiceTranscript(current, chunk)
                    )
                  }
                />
              </div>
              <Textarea
                id="step1-context"
                rows={2}
                value={sessionContext}
                onChange={(e) => setSessionContext(e.target.value)}
                placeholder="Contexto inicial, acuerdos o notas previas a la tirada…"
              />
            </div>

            {/* Bottom Actions for Step 1 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCancelDialogOpen(true)}
                className="text-muted hover:text-negative self-start sm:self-auto"
              >
                Cancelar lectura
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleSaveDraft()}
                  disabled={isSavingDraft || isPending}
                  className="flex items-center gap-1.5 border-border min-w-0"
                >
                  <Bookmark className="size-4 shrink-0" aria-hidden="true" />
                  <span>{isSavingDraft ? "Guardando…" : "Guardar borrador"}</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNextStep1}
                  className="min-w-0"
                >
                  <span className="hidden sm:inline">Siguiente: Indicar cartas y notas</span>
                  <span className="sm:hidden">Siguiente: Cartas →</span>
                  <ArrowRight className="hidden sm:inline size-4 shrink-0 ml-1" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right column: Preview of chosen structure */}
          <aside className="min-w-0 lg:col-span-5 space-y-5 lg:sticky lg:top-6">
            <div className="rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-ink">
                    {spreadMode === "custom"
                      ? "Estructura personalizada"
                      : (selectedClassicSpread?.name ?? "Estructura de cartas")}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {spreadMode === "custom"
                      ? `Has configurado ${customPositions.length} cartas. En el paso 2 elegirás qué carta salió en cada una, y en el paso 3 las acomodarás espacialmente.`
                      : selectedClassicSpread?.description}
                  </p>
                </div>
                <Layers className="size-4 text-muted shrink-0 mt-0.5" aria-hidden="true" />
              </div>

              {spreadMode === "classic" && selectedClassicSpread ? (
                <div className="border-t border-border pt-3 space-y-2">
                  <h4 className="text-xs font-semibold text-ink">
                    Posiciones de la tirada ({selectedClassicSpread.positions.length})
                  </h4>
                  <ol className="space-y-2 text-xs text-muted max-h-72 overflow-y-auto pr-1">
                    {selectedClassicSpread.positions.map((pos) => (
                      <li key={pos.positionIndex} className="flex items-start gap-2">
                        <span className="font-semibold text-ink num-tabular mt-0.5">
                          {pos.positionIndex}.
                        </span>
                        <div>
                          <p className="font-medium text-ink">{pos.title}</p>
                          {pos.prompt ? (
                            <p className="text-[11px] text-muted">{pos.prompt}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <div className="rounded-lg border border-border/70 bg-surface/70 p-3 text-xs text-muted flex items-start gap-2.5">
                <Sparkles className="size-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                <p className="leading-relaxed">
                  <strong>Flujo guiado en 3 pasos:</strong> Primero configuras la estructura. Luego indicas las cartas, eventos y notas. Finalmente acomodas la mesa a tu gusto.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 2: Selección de Cartas por Mazo Elegido, Eventos y Notas              */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Deck filtering summary banner */}
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-accent">
                Filtro de cartas activo por mazo
              </p>
              <p className="text-xs text-ink">
                Mostrando únicamente las <strong>{availableFilteredCards.length} cartas</strong> correspondientes a:{" "}
                <span className="font-medium text-accent">{selectedDeckTraditionsLabel}</span>.
              </p>
            </div>
            <div className="text-xs text-muted">
              Paso 2 de 3: Cartas y notas
            </div>
          </div>

          {/* Cards for each position in the spread */}
          <div className="space-y-4">
            {cardSlots.map((slot) => {
              const isNotesExpanded = expandedNotesIndex === slot.positionIndex;
              const slotEvents = localDeckEvents.filter(
                (e) => e.positionIndex === slot.positionIndex
              );
              const selectedCard = slot.cardId
                ? cardByIdMap.get(slot.cardId)
                : null;

              // EXCLUDE cards already selected in OTHER slots (a card cannot come out more than once!)
              const otherSelectedCardIds = new Set(
                cardSlots
                  .filter((s) => s.positionIndex !== slot.positionIndex && s.cardId)
                  .map((s) => s.cardId)
              );
              const cardsForThisSlot = availableFilteredCards.filter(
                (c) => !otherSelectedCardIds.has(c.id)
              );

              return (
                <div
                  key={slot.positionIndex}
                  className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4 transition-colors hover:border-border-hover min-w-0 max-w-full overflow-hidden"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3 min-w-0 max-w-full">
                    <div className="flex items-center gap-2.5 min-w-0 max-w-[calc(100%-115px)] sm:max-w-none">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-accent text-on-primary text-xs font-semibold shrink-0 num-tabular">
                        {slot.positionIndex}
                      </span>
                      <div className="min-w-0 truncate">
                        <h3 className="text-sm font-semibold text-ink truncate">
                          {slot.positionTitle}
                        </h3>
                        {slot.positionPrompt ? (
                          <p className="text-xs text-muted truncate">
                            {slot.positionPrompt}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {selectedCard ? (
                        <Badge variant="positive">Carta asignada</Badge>
                      ) : (
                        <Badge variant="neutral">Pendiente</Badge>
                      )}
                      {slotEvents.length > 0 ? (
                        <Badge variant="phenomenon">
                          {slotEvents.length}{" "}
                          {slotEvents.length === 1 ? "evento" : "eventos"}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {/* Card selector & Orientation row */}
                  <div className="grid gap-3 sm:grid-cols-12 items-center min-w-0 max-w-full">
                    <div className="sm:col-span-8 min-w-0 max-w-full">
                      <Label
                        htmlFor={`card-select-${slot.positionIndex}`}
                        className="text-xs text-muted mb-1 block"
                      >
                        Carta colocada en esta posición
                      </Label>
                      <CardCombobox
                        id={`card-select-${slot.positionIndex}`}
                        cards={cardsForThisSlot}
                        value={slot.cardId}
                        onChange={(cardId) =>
                          updateCardSlot(slot.positionIndex, { cardId })
                        }
                        placeholder={`Seleccionar carta para «${slot.positionTitle}»…`}
                        allowClear
                        deckNamesMap={deckNamesMap}
                        customDecks={activeCustomDecks}
                        onRegisterCustomCard={(deckId) =>
                          handleOpenRegisterCard(deckId, slot.positionIndex)
                        }
                      />
                    </div>

                    <div className="sm:col-span-4 min-w-0 max-w-full">
                      <Label className="text-xs text-muted mb-1 block">
                        Orientación
                      </Label>
                      <div className="inline-flex w-full rounded-lg border border-control bg-raised p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateCardSlot(slot.positionIndex, {
                              orientation: "upright",
                            })
                          }
                          className={cn(
                            "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer",
                            slot.orientation === "upright"
                              ? "bg-surface text-ink shadow-xs"
                              : "text-muted hover:text-ink"
                          )}
                        >
                          Al derecho
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateCardSlot(slot.positionIndex, {
                              orientation: "reversed",
                            })
                          }
                          className={cn(
                            "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer",
                            slot.orientation === "reversed"
                              ? "bg-warning/20 text-warning font-semibold shadow-xs"
                              : "text-muted hover:text-ink"
                          )}
                        >
                          Invertida
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Physical Events associated with this card slot */}
                  <div className="rounded-lg border border-border/80 bg-ground p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Zap className="size-3.5 text-accent" aria-hidden="true" />
                        <span className="text-xs font-semibold text-ink">
                          Eventos físicos del mazo
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => openDeckEventModal(slot.positionIndex)}
                        className="h-7 px-2.5 text-xs"
                      >
                        <Plus className="size-3 mr-1" aria-hidden="true" />
                        <span>Registrar evento</span>
                      </Button>
                    </div>

                    {slotEvents.length > 0 ? (
                      <div className="space-y-1.5">
                        {slotEvents.map((ev) => {
                          const option = PHENOMENON_OPTIONS.find(
                            (o) => o.type === ev.phenomenonType
                          );
                          const IconComp = option?.icon || Sparkles;
                          return (
                            <div
                              key={ev.localId}
                              className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <IconComp
                                  className="size-3.5 text-accent shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="font-semibold text-accent shrink-0">
                                  {PHENOMENON_LABELS[ev.phenomenonType]}:
                                </span>
                                <span className="truncate text-ink">
                                  {ev.observationDescription}
                                </span>
                                <span className="text-muted text-[11px] shrink-0">
                                  ({DECK_PHASE_LABELS[ev.occurredPhase]})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeDeckEvent(ev.localId)}
                                aria-label="Quitar evento"
                                className="text-muted hover:text-negative shrink-0 p-1 cursor-pointer"
                              >
                                <X className="size-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted italic">
                        Sin eventos registrados (ej. saltó al barajar, cayó de la mesa, dada vuelta).
                      </p>
                    )}
                  </div>

                  {/* Collapsible Notes on card emergence & contextual interpretation */}
                  <div className="border-t border-border/80 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedNotesIndex(
                          isNotesExpanded ? null : slot.positionIndex
                        )
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline py-1 cursor-pointer"
                    >
                      {isNotesExpanded ? (
                        <>
                          <ChevronUp className="size-3.5" aria-hidden="true" />
                          <span>Ocultar notas e interpretación de esta carta</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3.5" aria-hidden="true" />
                          <span>
                            {slot.observationNotes || slot.contextualInterpretation
                              ? "Editar notas e interpretación (con notas)"
                              : "+ Agregar notas sobre la salida de esta carta"}
                          </span>
                        </>
                      )}
                    </button>

                    {isNotesExpanded ? (
                      <div className="mt-3 space-y-3 rounded-lg border border-border bg-ground p-3.5 animate-in fade-in duration-200">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Label
                              htmlFor={`notes-obs-${slot.positionIndex}`}
                              className="text-xs text-muted"
                            >
                              Notas sobre la salida y observación inmediata
                            </Label>
                            <VoiceMicButton
                              fieldLabel={`notas de la carta ${slot.positionIndex}`}
                              onTranscript={(chunk) =>
                                updateCardSlot(slot.positionIndex, {
                                  observationNotes: appendVoiceTranscript(
                                    slot.observationNotes,
                                    chunk
                                  ),
                                })
                              }
                            />
                          </div>
                          <Textarea
                            id={`notes-obs-${slot.positionIndex}`}
                            rows={2}
                            value={slot.observationNotes}
                            onChange={(e) =>
                              updateCardSlot(slot.positionIndex, {
                                observationNotes: e.target.value,
                              })
                            }
                            placeholder="Detalles de cómo apareció la carta, impresiones espontáneas o simbolismo notorio…"
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Label
                              htmlFor={`notes-interp-${slot.positionIndex}`}
                              className="text-xs text-muted"
                            >
                              Interpretación contextual
                            </Label>
                            <VoiceMicButton
                              fieldLabel={`interpretación de la carta ${slot.positionIndex}`}
                              onTranscript={(chunk) =>
                                updateCardSlot(slot.positionIndex, {
                                  contextualInterpretation: appendVoiceTranscript(
                                    slot.contextualInterpretation,
                                    chunk
                                  ),
                                })
                              }
                            />
                          </div>
                          <Textarea
                            id={`notes-interp-${slot.positionIndex}`}
                            rows={2}
                            value={slot.contextualInterpretation}
                            onChange={(e) =>
                              updateCardSlot(slot.positionIndex, {
                                contextualInterpretation: e.target.value,
                              })
                            }
                            placeholder="¿Qué responde esta carta a la consulta o al consultante?"
                            className="text-xs"
                          />
                        </div>

                        <label
                          htmlFor={`notes-sync-${slot.positionIndex}`}
                          className="flex items-center gap-2 cursor-pointer pt-1"
                        >
                          <Checkbox
                            id={`notes-sync-${slot.positionIndex}`}
                            checked={slot.syncToGrimorio}
                            onCheckedChange={(val) =>
                              updateCardSlot(slot.positionIndex, {
                                syncToGrimorio: val === true,
                              })
                            }
                          />
                          <span className="text-xs text-muted">
                            Sincronizar apunte al Grimorio personal
                          </span>
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

            {/* Bottom Actions for Step 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBackToStep1}
                  className="min-w-0"
                >
                  <ArrowLeft className="size-4 shrink-0 mr-1" aria-hidden="true" />
                  <span className="hidden sm:inline">Volver a Configuración</span>
                  <span className="sm:hidden">← Volver</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCancelDialogOpen(true)}
                  className="text-muted hover:text-negative"
                >
                  Cancelar lectura
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleSaveDraft()}
                  disabled={isSavingDraft || isPending}
                  className="flex items-center gap-1.5 border-border min-w-0"
                >
                  <Bookmark className="size-4 shrink-0" aria-hidden="true" />
                  <span>{isSavingDraft ? "Guardando…" : "Guardar borrador"}</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNextStep2}
                  className="min-w-0"
                >
                  <span className="hidden sm:inline">Siguiente: Acomodar cartas en la mesa</span>
                  <span className="sm:hidden">Siguiente: Tapete →</span>
                  <ArrowRight className="hidden sm:inline size-4 shrink-0 ml-1" aria-hidden="true" />
                </Button>
              </div>
            </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 3: Acomodar Cartas en la Mesa (Tapete Interactivo) & Guardar          */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Step 3 Header Banner */}
          <div className="rounded-xl border border-border bg-ground p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-ink">
                Acomoda las cartas en el tapete de lectura
              </h2>
              <p className="text-xs text-muted">
                Arrastra las cartas con el ratón o con el dedo para colocarlas exactamente en la posición que desees. La navegación vertical queda bloqueada mientras mueves las cartas para tu comodidad.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={distributeHorizontal}
                className="text-xs h-7.5"
              >
                {cardSlots.length >= 5 ? "Distribuir en mesa" : "Alinear en línea"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={resetToTemplatePositions}
                className="text-xs h-7.5 text-muted hover:text-ink"
              >
                <RotateCcw className="size-3 mr-1" aria-hidden="true" />
                <span>Restablecer</span>
              </Button>
            </div>
          </div>

          {/* Interactive Spatial Map */}
          <div className="space-y-4">
            <SpreadMap
              slots={step3MapSlots}
              activePositionIndex={activeBoardIndex}
              onSelectPosition={(idx) => setActiveBoardIndex(idx)}
              editable={true}
              onMovePosition={handleMoveBoardCard}
              onPreviewNotesChange={(positionIndex, field, value) =>
                updateCardSlot(positionIndex, { [field]: value })
              }
            />
          </div>

          {/* Final Session Synthesis & Tags */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink">
              Síntesis y notas finales de la lectura{" "}
              <span className="text-muted font-normal">(opcional)</span>
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="step3-session-title">Título de la lectura</Label>
              <Input
                id="step3-session-title"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="Ej. Lectura de claridad profesional, Tirada de luna nueva…"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="step3-observations">
                    Observaciones generales
                  </Label>
                  <VoiceMicButton
                    fieldLabel="observaciones generales"
                    onTranscript={(chunk) =>
                      setGeneralObservations((current) =>
                        appendVoiceTranscript(current, chunk)
                      )
                    }
                  />
                </div>
                <Textarea
                  id="step3-observations"
                  rows={3}
                  value={generalObservations}
                  onChange={(e) => setGeneralObservations(e.target.value)}
                  placeholder="Atmósfera de la lectura, sincronicidades, comentarios del consultante…"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="step3-synthesis">Síntesis o conclusión</Label>
                  <VoiceMicButton
                    fieldLabel="síntesis o conclusión"
                    onTranscript={(chunk) =>
                      setSessionSynthesis((current) =>
                        appendVoiceTranscript(current, chunk)
                      )
                    }
                  />
                </div>
                <Textarea
                  id="step3-synthesis"
                  rows={3}
                  value={sessionSynthesis}
                  onChange={(e) => setSessionSynthesis(e.target.value)}
                  placeholder="Mensaje central de la tirada, consejo final o plan de acción…"
                />
              </div>
            </div>

            <div className="space-y-1.5 pb-3">
              <Label>Etiquetas de la lectura</Label>
              <TagInput
                value={readingTags}
                onChange={setReadingTags}
                suggestions={tagSuggestions}
                placeholder="Escribe una etiqueta y pulsa Enter (ej. trabajo, vínculos, consejo)…"
              />
            </div>
          </div>

          {/* Bottom Actions for Step 3 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleBackToStep2}
                disabled={isPending}
                className="min-w-0"
              >
                <ArrowLeft className="size-4 shrink-0 mr-1" aria-hidden="true" />
                <span className="hidden sm:inline">Volver a Cartas y Notas</span>
                <span className="sm:hidden">← Volver</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCancelDialogOpen(true)}
                disabled={isPending}
                className="text-muted hover:text-negative"
              >
                Cancelar lectura
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => handleSaveDraft()}
                disabled={isSavingDraft || isPending}
                className="flex items-center gap-1.5 border-border min-w-0"
              >
                <Bookmark className="size-4 shrink-0" aria-hidden="true" />
                <span>{isSavingDraft ? "Guardando…" : "Guardar borrador"}</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleCompleteAndSave}
                disabled={isPending}
                className="min-w-0 font-medium"
              >
                <Sparkles className="size-4 shrink-0 mr-1" aria-hidden="true" />
                <span>
                  {isPending
                    ? "Guardando lectura…"
                    : (
                      <>
                        <span className="hidden sm:inline">Completar y guardar lectura</span>
                        <span className="sm:hidden">Finalizar lectura</span>
                      </>
                    )}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: Registrar Nueva Carta en Mazo Personalizado (Reactivo)            */}
      {/* ========================================================================= */}
      <Dialog
        open={registerCardModal !== null}
        onOpenChange={(open) => {
          if (!open) setRegisterCardModal(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar nueva carta</DialogTitle>
            <DialogDescription>
              Añade una nueva carta a tu mazo «{registerCardModal?.deckName}». Se guardará inmediatamente y se asignará a esta posición.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-card-name-input">Nombre de la carta</Label>
              <Input
                id="custom-card-name-input"
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveCustomCard();
                  }
                }}
                placeholder="Ej. El Faraón, La Llave Maestra, El Guardián…"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRegisterCardModal(null)}
              disabled={isSavingCustomCard}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveCustomCard}
              disabled={isSavingCustomCard}
            >
              {isSavingCustomCard ? "Guardando carta…" : "Guardar y asignar carta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: Registrar Evento Físico del Mazo (Paso 2, 100% Lucide Icons)      */}
      {/* ========================================================================= */}
      <Dialog
        open={eventModalSlotIndex !== null}
        onOpenChange={(open) => {
          if (!open) setEventModalSlotIndex(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar evento físico del mazo</DialogTitle>
            <DialogDescription>
              Asociado a la posición #{eventModalSlotIndex}:{" "}
              {cardSlots.find((s) => s.positionIndex === eventModalSlotIndex)
                ?.positionTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo de fenómeno</Label>
              <div className="grid grid-cols-2 gap-2">
                {PHENOMENON_OPTIONS.map((opt) => {
                  const IconComp = opt.icon;
                  const isSelected = modalPhenomenon === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setModalPhenomenon(opt.type)}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border p-2 text-left transition-colors text-xs cursor-pointer",
                        isSelected
                          ? "border-accent bg-accent/10 text-ink ring-1 ring-accent"
                          : "border-border bg-surface hover:bg-surface-raised text-muted hover:text-ink"
                      )}
                    >
                      <IconComp
                        className={cn(
                          "size-4 shrink-0 mt-0.5",
                          isSelected ? "text-accent" : "text-muted"
                        )}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold">{opt.label}</p>
                        <p className="text-[10px] text-muted truncate">{opt.hint}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modal-phase">Fase en la que ocurrió</Label>
              <select
                id="modal-phase"
                value={modalPhase}
                onChange={(e) => setModalPhase(e.target.value as DeckPhase)}
                className="flex h-9 w-full rounded-lg border border-control bg-raised px-3 text-xs text-ink"
              >
                {PHASE_OPTIONS.map((p) => (
                  <option key={p.phase} value={p.phase}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="modal-desc">Descripción del suceso</Label>
                <VoiceMicButton
                  fieldLabel="descripción del suceso"
                  onTranscript={(chunk) =>
                    setModalDescription((current) =>
                      appendVoiceTranscript(current, chunk)
                    )
                  }
                />
              </div>
              <Textarea
                id="modal-desc"
                rows={2}
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
                placeholder="Ej. La carta saltó sola hacia la derecha al mezclar la segunda pasada…"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="modal-interp">
                  Interpretación intuitiva{" "}
                  <span className="text-muted font-normal">(opcional)</span>
                </Label>
                <VoiceMicButton
                  fieldLabel="interpretación intuitiva"
                  onTranscript={(chunk) =>
                    setModalInterpretation((current) =>
                      appendVoiceTranscript(current, chunk)
                    )
                  }
                />
              </div>
              <Textarea
                id="modal-interp"
                rows={2}
                value={modalInterpretation}
                onChange={(e) => setModalInterpretation(e.target.value)}
                placeholder="¿Qué significado o aviso sugiere este fenómeno?"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEventModalSlotIndex(null)}
            >
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={saveDeckEvent}>
              Guardar evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ALERT DIALOG: Confirmación de Cancelar Lectura (Requiere doble pulsación)  */}
      {/* ========================================================================= */}
      <AlertDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deseas cancelar la lectura?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cerrará la mesa y se perderán las configuraciones, cartas seleccionadas y notas ingresadas en esta lectura. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar con la lectura</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-negative text-white hover:bg-negative/90"
            >
              Sí, cancelar lectura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
