"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  PenLine,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { createQuickDeckAction } from "@/actions/grimorio-actions";
import {
  deleteReadingAction,
  removeDeckEventAction,
  saveReadingSessionAction,
} from "@/actions/reading-actions";
import { ConsultantAvatar } from "@/components/shared/consultant-avatar";
import { FormattedSessionDateTime } from "@/components/shared/formatted-session-date";
import { SpreadMap, buildSpreadSlots } from "@/components/shared/spread-map";
import { TarotCardPlate } from "@/components/shared/tarot-card-plate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardCombobox } from "@/components/ui/card-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import { DeckEventSheet } from "@/features/readings/deck-event-sheet";
import {
  DECK_PHASE_LABELS,
  DECK_TRADITION_LABELS,
  ORIENTATION_LABELS,
  PHENOMENON_LABELS,
  READING_STATUS_LABELS,
} from "@/lib/constants";
import {
  cn,
  createReadingTitle,
  formatDateLongEs,
  toDatetimeLocalValue,
} from "@/lib/utils";
import { selectDeckCards } from "@/lib/deck-cards";
import type {
  CanonicalCard,
  CardOrientation,
  Consultant,
  Deck,
  DeckEvent,
  ReadingDetail,
  ReadingStatus,
  SpreadTemplate,
} from "@/types/domain";

interface WorkbenchPositionSlot {
  localKey: string;
  positionIndex: number;
  positionTitle: string;
  positionPrompt: string;
  coordX: number;
  coordY: number;
  cardId: string;
  orientation: CardOrientation;
  observationNotes: string;
  contextualInterpretation: string;
  personalTakeaway: string;
  syncToGrimorio: boolean;
  alreadySynced: boolean;
}

interface LiveReadingWorkbenchProps {
  initialReading: ReadingDetail;
  cardsCatalog: CanonicalCard[];
  consultants: Consultant[];
  decks: Deck[];
  spreads: SpreadTemplate[];
  tagSuggestions: string[];
  autosaveEnabled: boolean;
}

type SaveIndicatorState = "saved" | "dirty" | "saving" | "error";

function buildInitialSlots(
  reading: ReadingDetail,
  spreads: SpreadTemplate[]
): WorkbenchPositionSlot[] {
  const tpl = spreads.find((s) => s.id === reading.spreadTemplateId);
  const basePositions =
    reading.customPositions.length > 0
      ? reading.customPositions
      : (tpl?.positions ?? []);

  const existingByPos = new Map(
    reading.cards.map((c) => [c.positionIndex, c])
  );

  const maxIndex = Math.max(
    reading.cards.reduce((acc, c) => Math.max(acc, c.positionIndex), 0),
    basePositions.length
  );

  if (maxIndex === 0) {
    return [
      {
        localKey: "slot-1",
        positionIndex: 1,
        positionTitle: "Carta 1",
        positionPrompt: "Situación principal",
        coordX: 50,
        coordY: 50,
        cardId: "",
        orientation: "upright",
        observationNotes: "",
        contextualInterpretation: "",
        personalTakeaway: "",
        syncToGrimorio: false,
        alreadySynced: false,
      },
    ];
  }

  const slots: WorkbenchPositionSlot[] = [];
  for (let idx = 1; idx <= maxIndex; idx += 1) {
    const saved = existingByPos.get(idx);
    const basePos = basePositions.find((p) => p.positionIndex === idx);
    const fallbackX = maxIndex === 1 ? 50 : 18 + ((idx - 1) * 64) / Math.max(1, maxIndex - 1);
    const coordX = basePos?.coordX ?? Math.min(88, Math.max(12, fallbackX));
    const coordY = basePos?.coordY ?? 50;

    if (saved) {
      // Si la posición quedó con el título automático «Carta N», mostramos el
      // nombre real de la carta elegida para que la lectura sea legible.
      const autoTitle = /^Carta\s+\d+$/i.test(saved.positionTitle.trim());
      const positionTitle =
        autoTitle && saved.card?.canonicalName
          ? saved.card.canonicalName
          : saved.positionTitle;

      slots.push({
        localKey: saved.id,
        positionIndex: idx,
        positionTitle,
        positionPrompt: saved.positionPrompt,
        coordX,
        coordY,
        cardId: saved.cardId,
        orientation: saved.orientation,
        observationNotes: saved.observationNotes,
        contextualInterpretation: saved.contextualInterpretation,
        personalTakeaway: saved.personalTakeaway,
        syncToGrimorio: saved.syncedToGrimorio,
        alreadySynced: saved.syncedToGrimorio,
      });
    } else if (basePos) {
      slots.push({
        localKey: `pos-${idx}`,
        positionIndex: idx,
        positionTitle: basePos.title,
        positionPrompt: basePos.prompt,
        coordX,
        coordY,
        cardId: "",
        orientation: "upright",
        observationNotes: "",
        contextualInterpretation: "",
        personalTakeaway: "",
        syncToGrimorio: false,
        alreadySynced: false,
      });
    } else {
      slots.push({
        localKey: `extra-${idx}`,
        positionIndex: idx,
        positionTitle: `Carta ${idx}`,
        positionPrompt: "",
        coordX,
        coordY,
        cardId: "",
        orientation: "upright",
        observationNotes: "",
        contextualInterpretation: "",
        personalTakeaway: "",
        syncToGrimorio: false,
        alreadySynced: false,
      });
    }
  }

  return slots;
}

function buildMarkdownExport(
  reading: {
    title: string;
    performedAt: string;
    status: ReadingStatus;
    consultantName: string;
    decksSummary: string;
    spreadName: string;
    questionIntention: string;
    sessionContext: string;
    generalObservations: string;
    sessionSynthesis: string;
    closingReflections: string;
    tags: string[];
  },
  slots: WorkbenchPositionSlot[],
  events: DeckEvent[],
  cardById: Map<string, CanonicalCard>
): string {
  const lines: string[] = [
    `# ${reading.title}`,
    "",
    `- **Fecha:** ${formatDateLongEs(reading.performedAt)}`,
    `- **Estado:** ${READING_STATUS_LABELS[reading.status]}`,
    `- **Consultante:** ${reading.consultantName}`,
    `- **Mazos:** ${reading.decksSummary}`,
    `- **Estructura:** ${reading.spreadName}`,
  ];
  if (reading.tags.length > 0) {
    lines.push(`- **Etiquetas:** ${reading.tags.join(", ")}`);
  }
  lines.push("");

  if (reading.questionIntention.trim()) {
    lines.push(
      "## Pregunta o tema de consulta",
      "",
      reading.questionIntention.trim(),
      ""
    );
  }
  if (reading.sessionContext.trim()) {
    lines.push("## Notas previas", "", reading.sessionContext.trim(), "");
  }

  const filledSlots = slots.filter((s) => s.cardId.trim().length > 0);
  if (filledSlots.length > 0) {
    lines.push("## Cartas registradas", "");
    for (const slot of filledSlots) {
      const card = cardById.get(slot.cardId);
      const cardTitle = card ? card.canonicalName : slot.cardId;
      lines.push(
        `### ${slot.positionIndex}. ${slot.positionTitle} — ${cardTitle} (${ORIENTATION_LABELS[slot.orientation]})`
      );
      if (slot.positionPrompt.trim()) {
        lines.push(`*Significado de la posición: ${slot.positionPrompt.trim()}*`, "");
      }
      if (slot.observationNotes.trim()) {
        lines.push(`- **Observación en la mesa:** ${slot.observationNotes.trim()}`);
      }
      if (slot.contextualInterpretation.trim()) {
        lines.push(
          `- **Interpretación en la consulta:** ${slot.contextualInterpretation.trim()}`
        );
      }
      if (slot.personalTakeaway.trim()) {
        lines.push(
          `- **Nota personal sobre la carta:** ${slot.personalTakeaway.trim()}`
        );
      }
      lines.push("");
    }
  }

  if (events.length > 0) {
    lines.push("## Eventos ocurridos con el mazo", "");
    for (const ev of events) {
      const label =
        ev.phenomenonType === "other" && ev.customPhenomenonLabel
          ? ev.customPhenomenonLabel
          : PHENOMENON_LABELS[ev.phenomenonType];
      lines.push(`### ${label} (${DECK_PHASE_LABELS[ev.occurredPhase]})`);
      if (ev.card) {
        lines.push(`- **Carta involucrada:** ${ev.card.canonicalName}`);
      }
      lines.push(`- **Qué ocurrió:** ${ev.observationDescription}`);
      if (ev.personalInterpretation.trim()) {
        lines.push(
          `- **Significado en la lectura:** ${ev.personalInterpretation.trim()}`
        );
      }
      lines.push("");
    }
  }

  if (reading.generalObservations.trim()) {
    lines.push(
      "## Observaciones generales",
      "",
      reading.generalObservations.trim(),
      ""
    );
  }
  if (reading.sessionSynthesis.trim()) {
    lines.push(
      "## Conclusión de la lectura",
      "",
      reading.sessionSynthesis.trim(),
      ""
    );
  }
  if (reading.closingReflections.trim()) {
    lines.push(
      "## Notas de seguimiento",
      "",
      reading.closingReflections.trim(),
      ""
    );
  }

  return lines.join("\n");
}

const cardSwapVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 32 : -32,
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.28,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -32 : 32,
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  }),
};

export function LiveReadingWorkbench({
  initialReading,
  cardsCatalog,
  consultants,
  decks,
  spreads,
  tagSuggestions,
  autosaveEnabled,
}: LiveReadingWorkbenchProps) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"live" | "dossier">(
    initialReading.status === "completed" ? "dossier" : "live"
  );

  // Core editable fields
  const [title, setTitle] = React.useState(() => {
    const savedTitle = initialReading.title.trim();
    const question = initialReading.questionIntention.trim();
    const cameFromQuestion =
      question.length > 0 &&
      (savedTitle === question ||
        (savedTitle.length >= 65 && question.startsWith(savedTitle)));
    const consultantName = consultants.find(
      (consultant) => consultant.id === initialReading.consultantId
    )?.displayName;
    return createReadingTitle(
      cameFromQuestion ? "" : savedTitle,
      initialReading.spreadName,
      consultantName
    );
  });
  const [consultantId, setConsultantId] = React.useState(
    initialReading.consultantId ?? ""
  );
  const [deckIds, setDeckIds] = React.useState<string[]>(() =>
    initialReading.deckIds.length > 0
      ? initialReading.deckIds
      : initialReading.deckId
        ? [initialReading.deckId]
        : []
  );
  const [liveDecks, setLiveDecks] = React.useState<Deck[]>(decks);
  const [isRegisteringDeck, setIsRegisteringDeck] = React.useState(false);
  const [quickDeckName, setQuickDeckName] = React.useState("");
  const [isCreatingQuickDeck, setIsCreatingQuickDeck] = React.useState(false);
  const [spreadTemplateId, setSpreadTemplateId] = React.useState(
    initialReading.spreadTemplateId ?? ""
  );
  const [spreadName, setSpreadName] = React.useState(initialReading.spreadName);
  const [performedAt, setPerformedAt] = React.useState(
    toDatetimeLocalValue(initialReading.performedAt)
  );
  const [status, setStatus] = React.useState<ReadingStatus>(
    initialReading.status
  );
  const [questionIntention, setQuestionIntention] = React.useState(
    initialReading.questionIntention
  );
  const [sessionContext, setSessionContext] = React.useState(
    initialReading.sessionContext
  );
  // Se conserva el valor heredado de lecturas anteriores, pero la interfaz ya
  // no expone un campo separado: todo se escribe en «Significado y
  // observaciones».
  const generalObservations = initialReading.generalObservations;
  const [sessionSynthesis, setSessionSynthesis] = React.useState(
    initialReading.sessionSynthesis
  );
  const [closingReflections, setClosingReflections] = React.useState(
    initialReading.closingReflections
  );
  const [tags, setTags] = React.useState<string[]>(
    initialReading.tags.map((t) => t.name)
  );
  const [slots, setSlots] = React.useState<WorkbenchPositionSlot[]>(() =>
    buildInitialSlots(initialReading, spreads)
  );
  const [events, setEvents] = React.useState<DeckEvent[]>(initialReading.events);

  // Selection & sheet state
  const [activePositionIndex, setActivePositionIndex] = React.useState<
    number | null
  >(1);
  const [slideDirection, setSlideDirection] = React.useState<number>(1);
  const [eventSheetOpen, setEventSheetOpen] = React.useState(false);
  const [eventDefaultPos, setEventDefaultPos] = React.useState<number | null>(
    null
  );
  const [eventDefaultCardId, setEventDefaultCardId] = React.useState("");

  // Save state
  const [saveState, setSaveState] = React.useState<SaveIndicatorState>("saved");
  const [lastSavedIso, setLastSavedIso] = React.useState(
    initialReading.updatedAt
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  const cardById = React.useMemo(
    () => new Map(cardsCatalog.map((c) => [c.id, c])),
    [cardsCatalog]
  );

  const sortedSlots = React.useMemo(() => {
    return [...slots].sort((a, b) => a.positionIndex - b.positionIndex);
  }, [slots]);

  const activeSlotIndex = React.useMemo(() => {
    if (activePositionIndex === null) return 0;
    const found = sortedSlots.findIndex(
      (s) => s.positionIndex === activePositionIndex
    );
    if (found !== -1) return found;
    let closestIdx = 0;
    let minDiff = Infinity;
    sortedSlots.forEach((s, idx) => {
      const diff = Math.abs(s.positionIndex - (activePositionIndex ?? 1));
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    return closestIdx;
  }, [sortedSlots, activePositionIndex]);

  const activeSlot = sortedSlots[activeSlotIndex] ?? slots[0] ?? null;

  const goToNextSlot = () => {
    if (activeSlotIndex < sortedSlots.length - 1) {
      setSlideDirection(1);
      setActivePositionIndex(sortedSlots[activeSlotIndex + 1].positionIndex);
    }
  };

  const goToPrevSlot = () => {
    if (activeSlotIndex > 0) {
      setSlideDirection(-1);
      setActivePositionIndex(sortedSlots[activeSlotIndex - 1].positionIndex);
    }
  };

  const selectSlotByPosition = (posIndex: number) => {
    const targetIdx = sortedSlots.findIndex((s) => s.positionIndex === posIndex);
    setSlideDirection(targetIdx >= activeSlotIndex ? 1 : -1);
    setActivePositionIndex(posIndex);
  };

  const activeDeckCards = React.useMemo(() => {
    if (!deckIds.length) {
      return cardsCatalog.filter((c) => c.deckTradition === "rws");
    }
    return selectDeckCards(cardsCatalog, liveDecks, deckIds);
  }, [cardsCatalog, deckIds, liveDecks]);

  const getCardsForSlot = React.useCallback(
    (currentCardId: string) => {
      if (
        currentCardId &&
        !activeDeckCards.some((c) => c.id === currentCardId)
      ) {
        const extra = cardById.get(currentCardId);
        if (extra) {
          return [extra, ...activeDeckCards];
        }
      }
      return activeDeckCards;
    },
    [activeDeckCards, cardById]
  );

  const eventPositionsSet = React.useMemo(() => {
    const s = new Set<number>();
    for (const ev of events) {
      if (ev.linkedPositionIndex !== null) {
        s.add(ev.linkedPositionIndex);
      }
    }
    return s;
  }, [events]);

  const mapSlots = React.useMemo(
    () =>
      buildSpreadSlots(
        slots.map((sl) => ({
          positionIndex: sl.positionIndex,
          title: sl.positionTitle,
          prompt: sl.positionPrompt,
          coordX: sl.coordX,
          coordY: sl.coordY,
        })),
        slots.map((sl) => ({
          positionIndex: sl.positionIndex,
          positionTitle: sl.positionTitle,
          card: sl.cardId ? (cardById.get(sl.cardId) ?? null) : null,
          orientation: sl.orientation,
          coordX: sl.coordX,
          coordY: sl.coordY,
          observationNotes: sl.observationNotes,
          contextualInterpretation: sl.contextualInterpretation,
          personalTakeaway: sl.personalTakeaway,
          events: events
            .filter((event) => event.linkedPositionIndex === sl.positionIndex)
            .map((event) => ({
              phenomenonType: event.phenomenonType,
              customPhenomenonLabel: event.customPhenomenonLabel,
              occurredPhase: event.occurredPhase,
              observationDescription: event.observationDescription,
              personalInterpretation: event.personalInterpretation,
            })),
        })),
        eventPositionsSet
      ),
    [slots, cardById, eventPositionsSet, events]
  );

  const markDirty = () => {
    setSaveState((prev) => (prev === "saving" ? prev : "dirty"));
  };

  const persistSession = React.useCallback(
    async (
      nextStatus: ReadingStatus,
      options: { showToast: boolean }
    ): Promise<boolean> => {
      const cleanTitle =
        createReadingTitle(
          title,
          spreadName,
          consultants.find((consultant) => consultant.id === consultantId)
            ?.displayName
        );

      const customPositions = slots.map((s, idx) => ({
        positionIndex: idx + 1,
        title: s.positionTitle.trim() || `Carta ${idx + 1}`,
        prompt: s.positionPrompt,
        coordX: s.coordX,
        coordY: s.coordY,
      }));

      const filledCards = slots
        .filter((s) => s.cardId.trim().length > 0)
        .map((s) => ({
          positionIndex: s.positionIndex,
          positionTitle: s.positionTitle.trim() || `Carta ${s.positionIndex}`,
          positionPrompt: s.positionPrompt,
          cardId: s.cardId,
          orientation: s.orientation,
          observationNotes: s.observationNotes,
          contextualInterpretation: s.contextualInterpretation,
          personalTakeaway: s.personalTakeaway,
          syncToGrimorio: s.syncToGrimorio,
        }));

      setSaveState("saving");
      const res = await saveReadingSessionAction({
        readingId: initialReading.id,
        title: cleanTitle,
        consultantId,
        deckIds,
        spreadTemplateId,
        spreadName: spreadName.trim() || "Estructura personalizada",
        customPositions,
        questionIntention,
        sessionContext,
        status: nextStatus,
        performedAt: new Date(performedAt).toISOString(),
        generalObservations,
        sessionSynthesis,
        closingReflections,
        tags,
        cards: filledCards,
      });

      if (!res.ok) {
        setSaveState("error");
        if (options.showToast) {
          toast.error(res.error);
        }
        return false;
      }

      setStatus(res.data.status);
      setTitle(res.data.title);
      setLastSavedIso(res.data.updatedAt);
      setSaveState("saved");

      const syncedIndices = new Set(
        res.data.cards
          .filter((c) => c.syncedToGrimorio)
          .map((c) => c.positionIndex)
      );
      setSlots((prev) =>
        prev.map((slot) =>
          syncedIndices.has(slot.positionIndex)
            ? { ...slot, alreadySynced: true, syncToGrimorio: true }
            : slot
        )
      );

      if (options.showToast) {
        toast.success(res.message ?? "Cambios guardados.");
      }
      return true;
    },
    [
      title,
      questionIntention,
      performedAt,
      slots,
      initialReading.id,
      consultantId,
      deckIds,
      spreadTemplateId,
      spreadName,
      sessionContext,
      generalObservations,
      sessionSynthesis,
      closingReflections,
      tags,
      consultants,
    ]
  );

  // Debounced autosave when dirty & enabled in live mode
  React.useEffect(() => {
    if (!autosaveEnabled || mode !== "live" || saveState !== "dirty") {
      return;
    }
    const timer = window.setTimeout(() => {
      void persistSession(status, { showToast: false });
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [autosaveEnabled, mode, saveState, persistSession, status]);

  const handleSelectMapPosition = (positionIndex: number) => {
    selectSlotByPosition(positionIndex);
    const el = document.getElementById("active-card-editor");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const updateSlot = (
    positionIndex: number,
    updater: (prev: WorkbenchPositionSlot) => WorkbenchPositionSlot
  ) => {
    setSlots((prev) =>
      prev.map((s) => (s.positionIndex === positionIndex ? updater(s) : s))
    );
    markDirty();
  };

  const handleMoveMapPosition = (
    positionIndex: number,
    coordX: number,
    coordY: number
  ) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.positionIndex === positionIndex ? { ...s, coordX, coordY } : s
      )
    );
    setActivePositionIndex(positionIndex);
    markDirty();
  };

  const addFreePosition = () => {
    const nextIdx =
      slots.reduce((max, s) => Math.max(max, s.positionIndex), 0) + 1;
    const col = (nextIdx - 1) % 4;
    const row = Math.floor((nextIdx - 1) / 4);
    const coordX = Math.min(86, 20 + col * 20);
    const coordY = Math.min(84, 28 + (row % 3) * 24);

    setSlots((prev) => [
      ...prev,
      {
        localKey: `custom-${Date.now()}-${nextIdx}`,
        positionIndex: nextIdx,
        positionTitle: `Carta ${nextIdx}`,
        positionPrompt: "",
        coordX,
        coordY,
        cardId: "",
        orientation: "upright",
        observationNotes: "",
        contextualInterpretation: "",
        personalTakeaway: "",
        syncToGrimorio: false,
        alreadySynced: false,
      },
    ]);
    setActivePositionIndex(nextIdx);
    markDirty();
  };

  const reorderPosition = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= slots.length || fromIdx === toIdx) return;
    setSlots((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      if (!moved) return prev;
      copy.splice(toIdx, 0, moved);
      return copy.map((s, idx) => ({
        ...s,
        positionIndex: idx + 1,
      }));
    });
    setActivePositionIndex(toIdx + 1);
    markDirty();
  };

  const removePosition = (positionIndex: number) => {
    setSlots((prev) => {
      const filtered = prev.filter((s) => s.positionIndex !== positionIndex);
      return filtered.map((s, idx) => ({
        ...s,
        positionIndex: idx + 1,
      }));
    });
    markDirty();
  };

  const applyTemplatePositions = (tpl: SpreadTemplate) => {
    setSlots((prev) => {
      const byIndex = new Map(prev.map((p) => [p.positionIndex, p]));
      const count = Math.max(tpl.positions.length, prev.length);
      const merged: WorkbenchPositionSlot[] = [];
      for (let idx = 1; idx <= count; idx += 1) {
        const existing = byIndex.get(idx);
        const tplPos = tpl.positions.find((p) => p.positionIndex === idx);
        if (existing) {
          merged.push({
            ...existing,
            positionTitle: tplPos ? tplPos.title : existing.positionTitle,
            positionPrompt: tplPos ? tplPos.prompt : existing.positionPrompt,
            coordX: tplPos ? tplPos.coordX : existing.coordX,
            coordY: tplPos ? tplPos.coordY : existing.coordY,
          });
        } else if (tplPos) {
          merged.push({
            localKey: `tpl-${tpl.id}-${idx}`,
            positionIndex: idx,
            positionTitle: tplPos.title,
            positionPrompt: tplPos.prompt,
            coordX: tplPos.coordX,
            coordY: tplPos.coordY,
            cardId: "",
            orientation: "upright",
            observationNotes: "",
            contextualInterpretation: "",
            personalTakeaway: "",
            syncToGrimorio: false,
            alreadySynced: false,
          });
        }
      }
      return merged;
    });
    markDirty();
  };

  const toggleLiveDeck = (targetDeckId: string, checked: boolean) => {
    setDeckIds((prev) =>
      checked
        ? Array.from(new Set([...prev, targetDeckId]))
        : prev.filter((id) => id !== targetDeckId)
    );
    markDirty();
  };

  const handleOpenDeckEventSheet = (
    positionIndex: number | null = null,
    cardId = ""
  ) => {
    setEventDefaultPos(positionIndex);
    setEventDefaultCardId(cardId);
    setEventSheetOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const res = await removeDeckEventAction(eventId, initialReading.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    toast.success(res.message ?? "Evento del mazo eliminado.");
  };

  const handleDeleteReading = async () => {
    setIsDeleting(true);
    const res = await deleteReadingAction(initialReading.id);
    setIsDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Lectura eliminada.");
    router.push("/lecturas");
  };

  const handleCompleteAndReturnHome = async () => {
    if (saveState === "saving") return;
    const ok = await persistSession("completed", { showToast: true });
    if (ok) {
      router.push("/");
      router.refresh();
    }
  };

  const currentConsultant = React.useMemo(
    () => consultants.find((c) => c.id === consultantId) ?? null,
    [consultants, consultantId]
  );

  const handleCreateQuickDeckOnWorkbench = async () => {
    const cleanName = quickDeckName.trim();
    if (!cleanName) {
      toast.error("Por favor ingresa un nombre para el nuevo mazo.");
      return;
    }
    setIsCreatingQuickDeck(true);
    try {
      const res = await createQuickDeckAction(cleanName);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const created = res.data;
      setLiveDecks((prev) => [...prev, created]);
      setDeckIds((prev) => Array.from(new Set([...prev, created.id])));
      markDirty();
      setQuickDeckName("");
      setIsRegisteringDeck(false);
      toast.success(
        `Mazo «${created.name}» registrado y añadido a la mesa. Verás un recordatorio en Inicio para completar sus datos.`
      );
    } finally {
      setIsCreatingQuickDeck(false);
    }
  };

  const selectedDecks = React.useMemo(
    () => liveDecks.filter((d) => deckIds.includes(d.id)),
    [liveDecks, deckIds]
  );

  const decksDisplayLabel =
    selectedDecks.length > 0
      ? selectedDecks.map((d) => d.name).join(" + ")
      : "Sin mazo especificado";

  const handleDownloadMarkdown = () => {
    const md = buildMarkdownExport(
      {
        title: title || initialReading.title,
        performedAt: new Date(performedAt).toISOString(),
        status,
        consultantName:
          currentConsultant?.displayName ?? "Lectura personal / Sin consultante",
        decksSummary:
          selectedDecks.length > 0
            ? selectedDecks
                .map(
                  (d) => `${d.name} (${DECK_TRADITION_LABELS[d.tradition]})`
                )
                .join(", ")
            : "Sin mazo especificado",
        spreadName: spreadName || "Estructura personalizada",
        questionIntention,
        sessionContext,
        generalObservations,
        sessionSynthesis,
        closingReflections,
        tags,
      },
      slots,
      events,
      cardById
    );

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slugTitle = (title || "lectura")
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñ]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    link.href = url;
    link.download = `lectura-${slugTitle || "tarot"}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Resumen exportado en Markdown.");
  };

  const filledCardsCount = slots.filter(
    (s) => s.cardId.trim().length > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb + Mode & Save Bar */}
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/lecturas"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Historial de lecturas</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <div
              aria-live="polite"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted num-tabular"
            >
              {saveState === "saving" ? (
                <span>Guardando…</span>
              ) : saveState === "dirty" ? (
                <span className="text-warning">Cambios sin guardar</span>
              ) : saveState === "error" ? (
                <button
                  type="button"
                  onClick={() => void persistSession(status, { showToast: true })}
                  className="font-medium text-negative underline"
                >
                  Error al guardar · Reintentar
                </button>
              ) : (
                <>
                  <Check className="size-3.5 text-positive" aria-hidden="true" />
                  <span>
                    Guardado ·{" "}
                    <FormattedSessionDateTime iso={lastSavedIso} timeOnly />
                  </span>
                </>
              )}
            </div>

            <Badge variant={status === "completed" ? "positive" : "warning"}>
              {READING_STATUS_LABELS[status]}
            </Badge>

            {/* Mode Switcher */}
            <div
              role="group"
              aria-label="Modo de visualización de la lectura"
              className="inline-flex rounded-lg border border-border bg-surface p-0.5"
            >
              <button
                type="button"
                onClick={() => setMode("live")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  mode === "live"
                    ? "bg-ground text-ink border border-border"
                    : "text-muted hover:text-ink"
                )}
              >
                <PenLine className="size-3.5" aria-hidden="true" />
                <span>Mesa en vivo</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("dossier")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  mode === "dossier"
                    ? "bg-ground text-ink border border-border"
                    : "text-muted hover:text-ink"
                )}
              >
                <Eye className="size-3.5" aria-hidden="true" />
                <span>Vista resumen</span>
              </button>
            </div>
          </div>
        </div>

        {/* Title & Primary Session Actions */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5 min-w-0 flex-1">
            {mode === "live" ? (
              <Input
                aria-label="Título de la sesión de lectura"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                placeholder="Título de la lectura…"
                className="font-serif text-2xl sm:text-3xl h-auto py-1.5 px-2.5 bg-transparent border-transparent hover:border-border focus-visible:bg-raised focus-visible:border-ink"
              />
            ) : (
              <h1 className="font-serif text-3xl text-ink">{title}</h1>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted px-1">
              {currentConsultant ? (
                <Link
                  href={`/consultantes/${currentConsultant.id}`}
                  className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-accent"
                >
                  <ConsultantAvatar
                    name={currentConsultant.displayName}
                    hue={currentConsultant.avatarHue}
                    size="sm"
                    className="size-5 text-[10px]"
                  />
                  <span>{currentConsultant.displayName}</span>
                </Link>
              ) : (
                <span>Lectura personal / Sin consultante</span>
              )}
              <span>·</span>
              <span>{spreadName || "Estructura personalizada"}</span>
              {selectedDecks.length > 0 ? (
                <>
                  <span>·</span>
                  <span>{decksDisplayLabel}</span>
                </>
              ) : null}
              <span>·</span>
              <span className="num-tabular">
                {filledCardsCount} cartas · {events.length} eventos del mazo
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === "live" ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenDeckEventSheet(null, "")}
                >
                  <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
                  <span>Registrar evento del mazo</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saveState === "saving"}
                  onClick={() => void persistSession("draft", { showToast: true })}
                >
                  <Save className="size-3.5" aria-hidden="true" />
                  <span>Guardar borrador</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={saveState === "saving"}
                  onClick={() => void handleCompleteAndReturnHome()}
                >
                  <Check className="size-3.5" aria-hidden="true" />
                  <span>
                    {status === "completed"
                      ? "Guardar y volver al inicio"
                      : "Completar lectura"}
                  </span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadMarkdown}
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  <span>Exportar Markdown</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => window.print()}
                >
                  <Printer className="size-3.5" aria-hidden="true" />
                  <span>Imprimir</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setMode("live")}
                >
                  <PenLine className="size-3.5" aria-hidden="true" />
                  <span>Editar en mesa</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {mode === "dossier" ? (
        /* =========================================================
           VISTA RESUMEN (LECTURA LIMPIA E IMPRESIÓN)
           ========================================================= */
        <div
          data-selectable="true"
          className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start"
        >
          <div className="min-w-0 lg:col-span-8 space-y-6">
            <section className="rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <h2 className="text-xs font-semibold text-ink">
                    Pregunta o tema de consulta
                  </h2>
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
                    {questionIntention || "Sin pregunta registrada."}
                  </p>
                </div>
                <div className="space-y-1">
                  <h2 className="text-xs font-semibold text-ink">
                    Notas previas
                  </h2>
                  <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
                    {sessionContext || "Sin notas previas."}
                  </p>
                </div>
              </div>
              {tags.length > 0 ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <h2 className="text-xs font-semibold text-ink">
                    Etiquetas temáticas
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {/* Spread Cards Summary */}
            <section className="rounded-xl border border-border bg-ground p-5 sm:p-6 space-y-5">
              <h2 className="text-sm font-semibold text-ink">
                Cartas registradas ({filledCardsCount})
              </h2>

              {filledCardsCount === 0 ? (
                <p className="text-sm text-muted">
                  Aún no se han anotado cartas en esta lectura.
                </p>
              ) : (
                <div className="divide-y divide-rule">
                  {slots
                    .filter((s) => s.cardId.trim().length > 0)
                    .map((slot) => {
                      const card = cardById.get(slot.cardId);
                      if (!card) return null;
                      return (
                        <article
                          key={slot.localKey}
                          className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-4"
                        >
                          <Link
                            href={`/grimorio/${card.slug}`}
                            className="shrink-0 self-start"
                          >
                            <TarotCardPlate
                              card={card}
                              orientation={slot.orientation}
                              size="md"
                            />
                          </Link>

                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <div>
                                <p className="text-xs text-muted num-tabular">
                                  Carta {slot.positionIndex} · {slot.positionTitle}
                                </p>
                                <Link
                                  href={`/grimorio/${card.slug}`}
                                  className="font-serif text-xl text-ink hover:text-accent"
                                >
                                  {card.canonicalName}
                                </Link>
                              </div>
                              <Badge
                                variant={
                                  slot.orientation === "reversed"
                                    ? "warning"
                                    : "neutral"
                                }
                              >
                                {ORIENTATION_LABELS[slot.orientation]}
                              </Badge>
                            </div>

                            {slot.observationNotes.trim() ? (
                              <div className="rounded-lg border border-border bg-surface p-3 space-y-1">
                                <p className="text-xs font-medium text-ink">
                                  1. Observación en la mesa
                                </p>
                                <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
                                  {slot.observationNotes}
                                </p>
                              </div>
                            ) : null}

                            {slot.contextualInterpretation.trim() ? (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-ink">
                                  2. Interpretación en la consulta
                                </p>
                                <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
                                  {slot.contextualInterpretation}
                                </p>
                              </div>
                            ) : null}

                            {slot.personalTakeaway.trim() ? (
                              <div className="rounded-lg border border-accent/30 bg-surface p-3 space-y-1">
                                <p className="text-xs font-medium text-accent">
                                  3. Nota personal para tu biblioteca de cartas
                                </p>
                                <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
                                  {slot.personalTakeaway}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                </div>
              )}
            </section>

            {/* Synthesis & Closing */}
            <section className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-sm font-semibold text-ink">
                  Significado y observaciones
                </h2>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
                  {[sessionSynthesis, generalObservations]
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .join("\n\n") || "Sin significado redactado todavía."}
                </p>
              </div>

              {closingReflections.trim() ? (
                <div className="border-t border-border pt-4 space-y-1.5">
                  <h3 className="text-xs font-semibold text-ink">
                    Notas de seguimiento
                  </h3>
                  <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
                    {closingReflections}
                  </p>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="min-w-0 lg:col-span-4 space-y-5">
            <section className="rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-3">
              <h2 className="text-sm font-semibold text-ink">
                Ubicación de las cartas
              </h2>
              <SpreadMap
                slots={mapSlots}
                activePositionIndex={activePositionIndex}
                onSelectPosition={setActivePositionIndex}
                editable
                onMovePosition={handleMoveMapPosition}
                onPreviewNotesChange={(positionIndex, field, value) =>
                  updateSlot(positionIndex, (slot) => ({
                    ...slot,
                    [field]: value,
                  }))
                }
              />
            </section>

            <section className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-ink">
                  Eventos del mazo ({events.length})
                </h2>
              </div>

              {events.length === 0 ? (
                <p className="text-xs text-muted leading-relaxed">
                  No se registraron cartas saltadas, caídas ni cortes especiales en esta lectura.
                </p>
              ) : (
                <div className="space-y-3">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-border bg-ground p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="phenomenon">
                          {ev.phenomenonType === "other" &&
                          ev.customPhenomenonLabel
                            ? ev.customPhenomenonLabel
                            : PHENOMENON_LABELS[ev.phenomenonType]}
                        </Badge>
                        <span className="text-[11px] text-muted">
                          {DECK_PHASE_LABELS[ev.occurredPhase]}
                        </span>
                      </div>
                      {ev.card ? (
                        <Link
                          href={`/grimorio/${ev.card.slug}`}
                          className="block text-xs font-semibold text-ink hover:text-accent"
                        >
                          {ev.card.canonicalName}
                        </Link>
                      ) : null}
                      <p className="text-xs text-ink leading-relaxed">
                        {ev.observationDescription}
                      </p>
                      {ev.personalInterpretation.trim() ? (
                        <p className="text-xs text-muted border-t border-border pt-1.5">
                          Significado: {ev.personalInterpretation}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      ) : (
        /* =========================================================
           MODO MESA EN VIVO
           ========================================================= */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="min-w-0 lg:col-span-8 space-y-6">
            <section
              aria-labelledby="heading-apertura-mesa"
              className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4"
            >
              <h2
                id="heading-apertura-mesa"
                className="text-sm font-semibold text-ink"
              >
                Datos de la sesión y mazos
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="live-consultant">Consultante</Label>
                  <select
                    id="live-consultant"
                    value={consultantId}
                    onChange={(e) => {
                      setConsultantId(e.target.value);
                      markDirty();
                    }}
                    className="flex h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink"
                  >
                    <option value="">Lectura personal / Sin consultante</option>
                    {consultants.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="live-performed-at">Fecha y hora</Label>
                  <DateTimePicker
                    id="live-performed-at"
                    value={performedAt}
                    onChange={(val) => {
                      setPerformedAt(val);
                      markDirty();
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Mazos en uso</Label>
                  {!isRegisteringDeck ? (
                    <button
                      type="button"
                      onClick={() => setIsRegisteringDeck(true)}
                      className="text-xs text-accent hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <Plus className="size-3" aria-hidden="true" />
                      <span>Registrar nuevo mazo</span>
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {liveDecks.map((d) => {
                    const checked = deckIds.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        htmlFor={`live-deck-${d.id}`}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs cursor-pointer transition-colors",
                          checked
                            ? "border-accent bg-ground text-ink font-medium"
                            : "border-border bg-ground/60 text-muted hover:text-ink"
                        )}
                      >
                        <Checkbox
                          id={`live-deck-${d.id}`}
                          checked={checked}
                          onCheckedChange={(val) =>
                            toggleLiveDeck(d.id, val === true)
                          }
                        />
                        <span>{d.name}</span>
                      </label>
                    );
                  })}
                </div>

                {isRegisteringDeck ? (
                  <div className="mt-2 space-y-2 rounded-lg border border-accent/40 bg-accent/5 p-3 t-page-enter">
                    <div className="flex items-center justify-between gap-2">
                      <Label
                        htmlFor="live-quick-deck-name"
                        className="text-xs font-medium text-accent"
                      >
                        Registrar nuevo mazo
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisteringDeck(false);
                          setQuickDeckName("");
                        }}
                        className="text-xs text-muted hover:text-ink inline-flex items-center gap-1"
                      >
                        <X className="size-3" aria-hidden="true" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="live-quick-deck-name"
                        value={quickDeckName}
                        onChange={(e) => setQuickDeckName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreateQuickDeckOnWorkbench();
                          }
                        }}
                        placeholder="Nombre del nuevo mazo (ej. Tarot Egipcio)…"
                        className="h-9 text-xs"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={handleCreateQuickDeckOnWorkbench}
                        disabled={isCreatingQuickDeck}
                        className="h-9 px-3 text-xs shrink-0"
                      >
                        {isCreatingQuickDeck ? "Guardando…" : "Registrar"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted">
                      Se añadirá inmediatamente a la mesa y verás un recordatorio en Inicio para completar su información.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="live-intention">
                    Pregunta o tema de consulta
                  </Label>
                  <Textarea
                    id="live-intention"
                    rows={2}
                    value={questionIntention}
                    onChange={(e) => {
                      setQuestionIntention(e.target.value);
                      markDirty();
                    }}
                    placeholder="Pregunta formulada o foco del encuentro…"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="live-context">Notas previas</Label>
                  <Textarea
                    id="live-context"
                    rows={2}
                    value={sessionContext}
                    onChange={(e) => {
                      setSessionContext(e.target.value);
                      markDirty();
                    }}
                    placeholder="Contexto inicial de la sesión…"
                  />
                </div>
              </div>
            </section>

            {/* Spread Positions Progressive Registry */}
            <section
              aria-labelledby="heading-posiciones-mesa"
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2
                    id="heading-posiciones-mesa"
                    className="text-base font-semibold text-ink"
                  >
                    Cartas en la mesa ({slots.length})
                  </h2>
                  <p className="text-xs text-muted">
                    Anota cada carta a medida que sale. Las posiciones vacías pueden completarse más tarde.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addFreePosition}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  <span>Agregar carta</span>
                </Button>
              </div>

              {slots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
                  <p className="text-sm text-muted">
                    No hay cartas en la mesa todavía.
                  </p>
                  <Button type="button" variant="primary" onClick={addFreePosition}>
                    <Plus className="size-4" aria-hidden="true" />
                    <span>Agregar primera carta</span>
                  </Button>
                </div>
              ) : activeSlot ? (
                <div id="active-card-editor" className="space-y-3.5">
                  {/* iOS-like Carousel / Segmented Navigation Header */}
                  <div className="rounded-xl border border-border bg-surface p-3 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={goToPrevSlot}
                          disabled={activeSlotIndex === 0}
                          aria-label="Carta anterior"
                          className="h-8 px-2 text-xs"
                        >
                          <ChevronLeft className="size-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Anterior</span>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={goToNextSlot}
                          disabled={activeSlotIndex === sortedSlots.length - 1}
                          aria-label="Siguiente carta"
                          className="h-8 px-2 text-xs"
                        >
                          <span className="hidden sm:inline">Siguiente</span>
                          <ChevronRight className="size-4" aria-hidden="true" />
                        </Button>
                      </div>

                      <div className="text-center min-w-0">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-ground border border-border px-2.5 py-0.5 text-xs font-medium text-ink num-tabular">
                          <span className="size-1.5 rounded-full bg-accent" />
                          Carta {activeSlotIndex + 1} de {sortedSlots.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addFreePosition}
                          aria-label="Agregar otra carta a la mesa"
                          className="h-8 px-2 text-xs"
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline">Agregar carta</span>
                        </Button>
                      </div>
                    </div>

                    {/* Quick Card Pills Row */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                      {sortedSlots.map((s) => {
                        const isCurrent = s.positionIndex === activeSlot.positionIndex;
                        const hasCard = Boolean(s.cardId);
                        const cardName = s.cardId ? cardById.get(s.cardId)?.canonicalName : null;
                        return (
                          <button
                            key={s.localKey}
                            type="button"
                            onClick={() => selectSlotByPosition(s.positionIndex)}
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-[color,background-color,border-color,box-shadow,transform] select-none",
                              isCurrent
                                ? "bg-ink text-ground shadow-xs ring-2 ring-accent/60 scale-[1.02]"
                                : "bg-ground border border-border text-ink hover:border-ink/60"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-flex size-4 items-center justify-center rounded-full text-[10px] font-semibold",
                                isCurrent
                                  ? "bg-accent text-on-primary"
                                  : hasCard
                                  ? "bg-positive/20 text-positive"
                                  : "bg-surface text-muted"
                              )}
                            >
                              {s.positionIndex}
                            </span>
                            <span className="truncate max-w-[120px]">
                              {s.positionTitle || `Carta ${s.positionIndex}`}
                            </span>
                            {hasCard ? (
                              <span
                                className={cn(
                                  "size-1.5 rounded-full shrink-0",
                                  isCurrent ? "bg-accent" : "bg-positive"
                                )}
                                title={cardName ?? "Carta asignada"}
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Single Animated Card Plate Menu */}
                  <div className="relative overflow-hidden">
                    <AnimatePresence mode="wait" custom={slideDirection}>
                      <motion.article
                        key={activeSlot.localKey || activeSlot.positionIndex}
                        custom={slideDirection}
                        variants={cardSwapVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="rounded-2xl border border-accent/40 bg-ground p-4 sm:p-5 space-y-4 will-change-transform"
                      >
                        {/* Position Header Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-accent text-on-primary text-xs font-semibold num-tabular shadow-xs">
                              {activeSlot.positionIndex}
                            </span>
                            <Input
                              aria-label={`Nombre de la posición ${activeSlot.positionIndex}`}
                              value={activeSlot.positionTitle}
                              onChange={(e) =>
                                updateSlot(activeSlot.positionIndex, (prev) => ({
                                  ...prev,
                                  positionTitle: e.target.value,
                                }))
                              }
                              className="h-8 text-sm font-medium bg-transparent border-transparent hover:border-border focus-visible:bg-raised focus-visible:border-ink min-w-0"
                            />
                          </div>

                          <div className="flex items-center gap-1 shrink-0 flex-wrap">
                            <button
                              type="button"
                              disabled={activeSlotIndex === 0}
                              onClick={() => reorderPosition(activeSlotIndex, activeSlotIndex - 1)}
                              aria-label={`Subir carta ${activeSlot.positionIndex}`}
                              title="Subir posición en la estructura"
                              className="rounded p-1 text-muted hover:bg-surface hover:text-ink disabled:opacity-35"
                            >
                              <ArrowUp className="size-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              disabled={activeSlotIndex === sortedSlots.length - 1}
                              onClick={() => reorderPosition(activeSlotIndex, activeSlotIndex + 1)}
                              aria-label={`Bajar carta ${activeSlot.positionIndex}`}
                              title="Bajar posición en la estructura"
                              className="rounded p-1 text-muted hover:bg-surface hover:text-ink disabled:opacity-35"
                            >
                              <ArrowDown className="size-3.5" aria-hidden="true" />
                            </button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() =>
                                handleOpenDeckEventSheet(
                                  activeSlot.positionIndex,
                                  activeSlot.cardId
                                )
                              }
                            >
                              <Sparkles
                                className="size-3.5 text-accent"
                                aria-hidden="true"
                              />
                              <span>Evento aquí</span>
                            </Button>

                            {slots.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removePosition(activeSlot.positionIndex)}
                                aria-label={`Quitar posición ${activeSlot.positionIndex}`}
                                title="Quitar carta de la mesa"
                                className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-negative"
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label
                            htmlFor={`pos-prompt-${activeSlot.positionIndex}`}
                            className="text-xs text-muted"
                          >
                            Significado de esta posición
                          </Label>
                          <Input
                            id={`pos-prompt-${activeSlot.positionIndex}`}
                            value={activeSlot.positionPrompt}
                            onChange={(e) =>
                              updateSlot(activeSlot.positionIndex, (prev) => ({
                                ...prev,
                                positionPrompt: e.target.value,
                              }))
                            }
                            placeholder="Qué función cumple esta carta en la estructura…"
                            className="h-8 text-xs"
                          />
                        </div>

                        {/* Card Picker + Orientation Row */}
                        <div className="grid gap-3 sm:grid-cols-12 items-start">
                          <div className="sm:col-span-8 space-y-1.5">
                            <Label htmlFor={`pos-card-${activeSlot.positionIndex}`}>
                              Carta que salió
                            </Label>
                            <CardCombobox
                              id={`pos-card-${activeSlot.positionIndex}`}
                              cards={getCardsForSlot(activeSlot.cardId)}
                              value={activeSlot.cardId}
                              onChange={(nextCardId) =>
                                updateSlot(activeSlot.positionIndex, (prev) => ({
                                  ...prev,
                                  cardId: nextCardId,
                                }))
                              }
                              allowClear
                            />
                          </div>

                          <div className="sm:col-span-4 space-y-1.5">
                            <Label>Orientación</Label>
                            <div
                              role="group"
                              aria-label={`Orientación de carta en posición ${activeSlot.positionIndex}`}
                              className="grid grid-cols-2 rounded-lg border border-control bg-raised p-0.5 h-11 sm:h-10"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  updateSlot(activeSlot.positionIndex, (prev) => ({
                                    ...prev,
                                    orientation: "upright",
                                  }))
                                }
                                className={cn(
                                  "rounded-md text-xs font-medium transition-colors",
                                  activeSlot.orientation === "upright"
                                    ? "bg-surface text-ink border border-border"
                                    : "text-muted hover:text-ink"
                                )}
                              >
                                Derecha
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateSlot(activeSlot.positionIndex, (prev) => ({
                                    ...prev,
                                    orientation: "reversed",
                                  }))
                                }
                                className={cn(
                                  "rounded-md text-xs font-medium transition-colors inline-flex items-center justify-center gap-1",
                                  activeSlot.orientation === "reversed"
                                    ? "bg-surface text-ink border border-border"
                                    : "text-muted hover:text-ink"
                                )}
                              >
                                <RotateCcw className="size-3" aria-hidden="true" />
                                <span>Invertida</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Quick Canonical Cue + Card Detail Link */}
                        {activeSlot.cardId && cardById.get(activeSlot.cardId) ? (
                          (() => {
                            const activeCard = cardById.get(activeSlot.cardId)!;
                            return (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs">
                                <span className="text-muted">
                                  Significado tradicional:{" "}
                                  <span className="text-ink">
                                    {activeSlot.orientation === "reversed"
                                      ? activeCard.traditionalReversed
                                      : activeCard.traditionalUpright}
                                  </span>
                                </span>
                                <Link
                                  href={`/grimorio/${activeCard.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline shrink-0"
                                >
                                  <BookOpen className="size-3.5" aria-hidden="true" />
                                  <span>Ver ficha de la carta</span>
                                </Link>
                              </div>
                            );
                          })()
                        ) : null}

                        {/* 3-Layer Notes */}
                        <div className="grid gap-3 pt-1">
                          <div className="space-y-1.5">
                            <Label htmlFor={`obs-${activeSlot.positionIndex}`}>
                              1. Observación en la mesa{" "}
                              <span className="text-muted font-normal">
                                (miradas entre figuras, orden de aparición, cercanía)
                              </span>
                            </Label>
                            <Textarea
                              id={`obs-${activeSlot.positionIndex}`}
                              rows={2}
                              value={activeSlot.observationNotes}
                              onChange={(e) =>
                                updateSlot(activeSlot.positionIndex, (prev) => ({
                                  ...prev,
                                  observationNotes: e.target.value,
                                }))
                              }
                              placeholder="Qué observas directamente en las cartas…"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor={`ctx-${activeSlot.positionIndex}`}>
                              2. Interpretación para esta consulta
                            </Label>
                            <Textarea
                              id={`ctx-${activeSlot.positionIndex}`}
                              rows={3}
                              value={activeSlot.contextualInterpretation}
                              onChange={(e) =>
                                updateSlot(activeSlot.positionIndex, (prev) => ({
                                  ...prev,
                                  contextualInterpretation: e.target.value,
                                }))
                              }
                              placeholder="Qué responde esta carta a la pregunta de la sesión…"
                            />
                          </div>

                          <div className="rounded-lg border border-border bg-surface p-3.5 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Label htmlFor={`takeaway-${activeSlot.positionIndex}`}>
                                3. Nota personal sobre esta carta{" "}
                                <span className="text-muted font-normal">
                                  (opcional)
                                </span>
                              </Label>
                              {activeSlot.alreadySynced ? (
                                <Badge variant="positive">
                                  Guardada en tu biblioteca de cartas
                                </Badge>
                              ) : null}
                            </div>
                            <Textarea
                              id={`takeaway-${activeSlot.positionIndex}`}
                              rows={2}
                              value={activeSlot.personalTakeaway}
                              onChange={(e) =>
                                updateSlot(activeSlot.positionIndex, (prev) => ({
                                  ...prev,
                                  personalTakeaway: e.target.value,
                                }))
                              }
                              placeholder="Idea o matiz nuevo que quieras guardar en la ficha de esta carta…"
                            />
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`sync-grimorio-${activeSlot.positionIndex}`}
                                checked={activeSlot.syncToGrimorio}
                                onCheckedChange={(checked) =>
                                  updateSlot(activeSlot.positionIndex, (prev) => ({
                                    ...prev,
                                    syncToGrimorio: checked === true,
                                  }))
                                }
                              />
                              <label
                                htmlFor={`sync-grimorio-${activeSlot.positionIndex}`}
                                className="text-xs text-muted cursor-pointer select-none"
                              >
                                Guardar esta nota en el historial personal de la carta
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Quick Navigation between Cards */}
                        <div className="flex items-center justify-between border-t border-border pt-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={goToPrevSlot}
                            disabled={activeSlotIndex === 0}
                            className="text-xs text-muted hover:text-ink"
                          >
                            <ChevronLeft className="size-4" aria-hidden="true" />
                            <span>
                              {activeSlotIndex > 0
                                ? `Anterior (${sortedSlots[activeSlotIndex - 1]?.positionTitle || `Carta ${sortedSlots[activeSlotIndex - 1]?.positionIndex}`})`
                                : "Primera carta"}
                            </span>
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={goToNextSlot}
                            disabled={activeSlotIndex === sortedSlots.length - 1}
                            className="text-xs"
                          >
                            <span>
                              {activeSlotIndex < sortedSlots.length - 1
                                ? `Siguiente (${sortedSlots[activeSlotIndex + 1]?.positionTitle || `Carta ${sortedSlots[activeSlotIndex + 1]?.positionIndex}`})`
                                : "Última carta"}
                            </span>
                            <ChevronRight className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </motion.article>
                    </AnimatePresence>
                  </div>
                </div>
              ) : null}
            </section>

            {/* Closing Synthesis, General Table Notes & Tags */}
            <section
              aria-labelledby="heading-cierre-lectura"
              className="rounded-xl border border-border bg-surface p-5 space-y-4"
            >
              <h2
                id="heading-cierre-lectura"
                className="text-sm font-semibold text-ink"
              >
                Conclusión y etiquetas
              </h2>

              <div className="space-y-1.5">
                <Label htmlFor="live-synthesis">
                  Significado y observaciones
                </Label>
                <Textarea
                  id="live-synthesis"
                  rows={4}
                  value={sessionSynthesis}
                  onChange={(e) => {
                    setSessionSynthesis(e.target.value);
                    markDirty();
                  }}
                  placeholder="Significado central de la tirada, atmósfera, sincronicidades, consejo final o plan de acción…"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="live-reflections">
                  Notas de seguimiento
                </Label>
                <Textarea
                  id="live-reflections"
                  rows={2}
                  value={closingReflections}
                  onChange={(e) => {
                    setClosingReflections(e.target.value);
                    markDirty();
                  }}
                  placeholder="Temas pendientes para próximas sesiones…"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="live-tags">Etiquetas de la lectura</Label>
                <TagInput
                  id="live-tags"
                  value={tags}
                  onChange={(next) => {
                    setTags(next);
                    markDirty();
                  }}
                  suggestions={tagSuggestions}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isDeleting}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      <span>Eliminar lectura</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        ¿Eliminar esta lectura permanentemente?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Se borrarán las cartas y eventos asociados a «{title}». Las notas ya guardadas en tu biblioteca de cartas se conservarán.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteReading}>
                        Sí, eliminar lectura
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saveState === "saving"}
                    onClick={() =>
                      void persistSession("draft", { showToast: true })
                    }
                  >
                    Guardar borrador
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={saveState === "saving"}
                    onClick={() => void handleCompleteAndReturnHome()}
                  >
                    Completar y guardar lectura
                  </Button>
                </div>
              </div>
            </section>
          </div>

          {/* Right 4 cols: Sticky Interactive Map + Physical Deck Events */}
          <aside className="min-w-0 lg:col-span-4 space-y-5 lg:sticky lg:top-6">
            <section
              aria-labelledby="heading-mapa-vivo"
              className="rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="heading-mapa-vivo"
                  className="text-sm font-semibold text-ink"
                >
                  Ubicación en la mesa
                </h2>
                <select
                  aria-label="Cambiar estructura de cartas"
                  value={spreadTemplateId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSpreadTemplateId(nextId);
                    const tpl = spreads.find((s) => s.id === nextId);
                    if (tpl) {
                      setSpreadName(tpl.name);
                      applyTemplatePositions(tpl);
                    } else {
                      setSpreadName("Estructura personalizada");
                    }
                    markDirty();
                  }}
                  className="h-8 max-w-[160px] sm:max-w-[180px] rounded-md border border-control bg-raised px-2 text-xs text-ink"
                >
                  {spreads.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                  <option value="">Personalizada</option>
                </select>
              </div>

              <SpreadMap
                slots={mapSlots}
                activePositionIndex={activePositionIndex}
                onSelectPosition={handleSelectMapPosition}
                editable
                onMovePosition={handleMoveMapPosition}
                onPreviewNotesChange={(positionIndex, field, value) =>
                  updateSlot(positionIndex, (slot) => ({
                    ...slot,
                    [field]: value,
                  }))
                }
              />

              {/* Botones de gestión directa bajo la mesa */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink">
                    Cartas en mesa ({slots.length})
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addFreePosition}
                    className="h-7 text-xs"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    <span>Agregar carta</span>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-0.5">
                  {slots.map((s) => (
                    <button
                      key={s.localKey}
                      type="button"
                      onClick={() => handleSelectMapPosition(s.positionIndex)}
                      className={cn(
                        "rounded-md px-2 py-1 text-xs transition-colors",
                        activePositionIndex === s.positionIndex
                          ? "bg-ink text-ground font-medium shadow-xs"
                          : "bg-surface border border-border text-ink hover:border-ink/60"
                      )}
                    >
                      {s.positionTitle || `Carta ${s.positionIndex}`}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-muted">
                  Pulsa cualquier carta para editar sus notas o arrástrala sobre el tapete para reposicionarla.
                </p>
              </div>
            </section>

            {/* Physical Deck Events Module */}
            <section
              aria-labelledby="heading-fenomenos-mesa"
              className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <h2
                    id="heading-fenomenos-mesa"
                    className="text-sm font-semibold text-ink"
                  >
                    Eventos del mazo ({events.length})
                  </h2>
                  <p className="text-xs text-muted">
                    Cartas que saltan, caen, quedan en la base o aparecen al cortar.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => handleOpenDeckEventSheet(null, "")}
              >
                <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
                <span>Anotar evento del mazo</span>
              </Button>

              {events.length === 0 ? (
                <div className="rounded-xl border border-border bg-ground p-4 text-center">
                  <p className="text-xs text-muted leading-relaxed">
                    Si al barajar o cortar salta una carta o queda alguna visible en la base del mazo, anótala aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-border bg-ground p-3.5 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="phenomenon">
                          {ev.phenomenonType === "other" &&
                          ev.customPhenomenonLabel
                            ? ev.customPhenomenonLabel
                            : PHENOMENON_LABELS[ev.phenomenonType]}
                        </Badge>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              aria-label="Eliminar evento del mazo"
                              className="rounded p-1 text-muted hover:bg-surface hover:text-negative"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                ¿Eliminar este evento del mazo?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Este registro se quitará de la lectura actual.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void handleDeleteEvent(ev.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span>{DECK_PHASE_LABELS[ev.occurredPhase]}</span>
                        {ev.linkedPositionIndex !== null ? (
                          <span className="num-tabular">
                            · Carta {ev.linkedPositionIndex}
                          </span>
                        ) : null}
                        <span className="num-tabular">
                          · <FormattedSessionDateTime iso={ev.occurredAt} />
                        </span>
                      </div>

                      {ev.card ? (
                        <Link
                          href={`/grimorio/${ev.card.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-xs font-semibold text-ink hover:text-accent"
                        >
                          Carta: {ev.card.canonicalName}
                        </Link>
                      ) : null}

                      <p className="text-xs text-ink leading-relaxed">
                        {ev.observationDescription}
                      </p>

                      {ev.personalInterpretation.trim() ? (
                        <p className="text-xs text-muted border-t border-border pt-1.5 leading-relaxed">
                          Significado: {ev.personalInterpretation}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      )}

      <DeckEventSheet
        open={eventSheetOpen}
        onOpenChange={setEventSheetOpen}
        readingId={initialReading.id}
        cards={activeDeckCards}
        availablePositions={slots.map((s) => ({
          positionIndex: s.positionIndex,
          positionTitle: s.positionTitle,
        }))}
        tagSuggestions={tagSuggestions}
        defaultPositionIndex={eventDefaultPos}
        defaultCardId={eventDefaultCardId}
        onRecorded={(newEvent) => {
          setEvents((prev) => [...prev, newEvent]);
        }}
      />
    </div>
  );
}
