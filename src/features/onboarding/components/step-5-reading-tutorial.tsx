"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Info,
  Plus,
  RotateCcw,
  User,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { PillStepper } from "@/features/onboarding/components/pill-stepper";
import { TarotCardPlate } from "@/components/shared/tarot-card-plate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  CanonicalCard,
  CardOrientation,
  Consultant,
  Deck,
  SpreadTemplate,
} from "@/types/domain";

export type ReadingTargetType = "for_me" | "no_consultant" | "consultant";

interface Step5ReadingTutorialProps {
  userFullName: string;
  consultants: Consultant[];
  canonicalCards: CanonicalCard[];
  spreads: SpreadTemplate[];
  selectedDeck: Deck | null;
  targetType: ReadingTargetType | null;
  selectedConsultantId: string | null;
  createdReadingId: string | null;
  hasSkippedReading: boolean;
  onTargetSelected: (
    type: ReadingTargetType,
    consultantId: string | null
  ) => void;
  onReadingCreated: (readingId: string) => void;
  onSkip: () => void;
  onContinue: () => void;
}

interface InteractiveCardSlot {
  positionIndex: number;
  title: string;
  prompt: string;
  card: CanonicalCard | null;
  orientation: CardOrientation;
  contextualNote: string;
}

export function Step5ReadingTutorial({
  userFullName,
  consultants,
  canonicalCards,
  spreads,
  selectedDeck,
  targetType,
  selectedConsultantId,
  createdReadingId: _createdReadingId,
  hasSkippedReading: _hasSkippedReading,
  onTargetSelected,
  onReadingCreated,
  onSkip,
  onContinue,
}: Step5ReadingTutorialProps) {
  const [substep, setSubstep] = React.useState<1 | 2>(1);
  const [subDirection, setSubDirection] = React.useState<"forward" | "backward">("forward");

  const handleSelectSubstep = (nextSubstep: 1 | 2) => {
    setSubDirection(nextSubstep >= substep ? "forward" : "backward");
    setSubstep(nextSubstep);
  };

  // Subetapa 1: Destinatario
  const [localTargetType, setLocalTargetType] =
    React.useState<ReadingTargetType | null>(targetType);
  const [localConsultantId, setLocalConsultantId] = React.useState<
    string | null
  >(selectedConsultantId);

  // Subetapa 2: Tirada seleccionada
  const activeSpread = spreads[0] ?? {
    id: "spread-triad-observation",
    name: "Pasado, Presente y Futuro (3 cartas)",
    category: "Clásica",
    description: "Estructura de tres naipes para explorar la línea temporal.",
    positions: [
      {
        positionIndex: 1,
        title: "Pasado",
        prompt: "Raíz y antecedentes del tema",
        coordX: 25,
        coordY: 50,
      },
      {
        positionIndex: 2,
        title: "Presente",
        prompt: "Situación actual y desafío central",
        coordX: 50,
        coordY: 50,
      },
      {
        positionIndex: 3,
        title: "Futuro",
        prompt: "Tendencia y consejo de dirección",
        coordX: 75,
        coordY: 50,
      },
    ],
    isBuiltin: true,
    createdAt: "",
    userId: null,
  };

  // Slots interactivos en la mesa
  const [slots, setSlots] = React.useState<InteractiveCardSlot[]>(() => {
    // Tomar 3 cartas sugeridas para el tutorial inicial (El Mago, La Estrella, El Sol o vacío)
    const card1 =
      canonicalCards.find((c) => c.slug.includes("mago")) ??
      canonicalCards[1] ??
      null;
    const card2 =
      canonicalCards.find((c) => c.slug.includes("estrella")) ??
      canonicalCards[17] ??
      null;

    return [
      {
        positionIndex: 1,
        title: "1. Pasado / Raíz",
        prompt: "El origen o punto de partida del tema",
        card: card1,
        orientation: "upright",
        contextualNote: "Iniciativa y recursos disponibles al comenzar el proyecto.",
      },
      {
        positionIndex: 2,
        title: "2. Presente / Desafío",
        prompt: "El estado actual y momento en la mesa",
        card: card2,
        orientation: "upright",
        contextualNote: "Claridad y confianza en el horizonte que se está abriendo.",
      },
      {
        positionIndex: 3,
        title: "3. Futuro / Dirección",
        prompt: "Hacia dónde se proyecta la energía",
        card: null,
        orientation: "upright",
        contextualNote: "",
      },
    ];
  });

  // Modales interactivos
  const [activeSlotForCardPicker, setActiveSlotForCardPicker] =
    React.useState<number | null>(null);
  const [activeCardForMeaning, setActiveCardForMeaning] =
    React.useState<CanonicalCard | null>(null);
  const [searchCardTerm, setSearchCardTerm] = React.useState<string>("");
  const [isSavingReading, setIsSavingReading] = React.useState<boolean>(false);

  // Manejar selección de destinatario en Subetapa 1
  const handleSelectTarget = (
    type: ReadingTargetType,
    consultantId: string | null = null
  ) => {
    setLocalTargetType(type);
    setLocalConsultantId(consultantId);
    onTargetSelected(type, consultantId);
  };

  // Asignar carta a un slot
  const handleAssignCard = (card: CanonicalCard) => {
    if (activeSlotForCardPicker === null) return;
    setSlots((prev) =>
      prev.map((slot) =>
        slot.positionIndex === activeSlotForCardPicker
          ? { ...slot, card, orientation: "upright" }
          : slot
      )
    );
    setActiveSlotForCardPicker(null);
    toast.success(`Carta «${card.canonicalName}» colocada en la posición.`);
  };

  // Intercambiar posiciones entre dos cartas
  const handleSwapSlots = (fromIndex: number, toIndex: number) => {
    setSlots((prev) => {
      const fromSlot = prev.find((s) => s.positionIndex === fromIndex);
      const toSlot = prev.find((s) => s.positionIndex === toIndex);
      if (!fromSlot || !toSlot) return prev;

      return prev.map((s) => {
        if (s.positionIndex === fromIndex) {
          return {
            ...s,
            card: toSlot.card,
            orientation: toSlot.orientation,
            contextualNote: toSlot.contextualNote,
          };
        }
        if (s.positionIndex === toIndex) {
          return {
            ...s,
            card: fromSlot.card,
            orientation: fromSlot.orientation,
            contextualNote: fromSlot.contextualNote,
          };
        }
        return s;
      });
    });
    toast.success("Posiciones reposicionadas en la mesa.");
  };

  // Invertir orientación de la carta
  const handleToggleOrientation = (positionIndex: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.positionIndex === positionIndex
          ? {
              ...s,
              orientation: s.orientation === "upright" ? "reversed" : "upright",
            }
          : s
      )
    );
  };

  // Guardar lectura real en la base de datos
  const handleSaveRealReading = async () => {
    setIsSavingReading(true);
    try {
      const { createReadingDraftAction, saveReadingSessionAction } =
        await import("@/actions/reading-actions");

      // 1. Crear borrador de lectura
      const draftRes = await createReadingDraftAction({
        title:
          localTargetType === "for_me"
            ? `Lectura de exploración personal (${userFullName})`
            : "Lectura inicial de bienvenida",
        consultantId:
          localTargetType === "consultant" && localConsultantId
            ? localConsultantId
            : "",
        appointmentId: "",
        deckIds: selectedDeck ? [selectedDeck.id] : [],
        quickNewDecks: [],
        quickNewConsultant: "",
        spreadMode: "classic",
        spreadTemplateId: activeSpread.id,
        spreadName: activeSpread.name,
        customPositions: [],
        questionIntention:
          "Exploración de práctica guiada realizada en el onboarding.",
        sessionContext: "Sesión inicial de aprendizaje.",
        performedAt: new Date().toISOString().slice(0, 16),
      });

      if (!draftRes.ok) {
        toast.error(draftRes.error || "No se pudo registrar la lectura.");
        setIsSavingReading(false);
        return;
      }

      const readingId = draftRes.data.id;

      // 2. Guardar las cartas asignadas en la sesión
      const cardsToPersist = slots
        .filter((s): s is InteractiveCardSlot & { card: CanonicalCard } =>
          Boolean(s.card)
        )
        .map((s) => ({
          positionIndex: s.positionIndex,
          positionTitle: s.title,
          positionPrompt: s.prompt,
          cardId: s.card.id,
          orientation: s.orientation,
          observationNotes: "Carta observada durante el tutorial de inicio.",
          contextualInterpretation: s.contextualNote || s.prompt,
          personalTakeaway: "",
          syncToGrimorio: false,
        }));

      if (cardsToPersist.length > 0) {
        await saveReadingSessionAction({
          readingId,
          title: draftRes.data.title,
          consultantId: draftRes.data.consultantId ?? "",
          deckIds: draftRes.data.deckIds ?? (selectedDeck ? [selectedDeck.id] : []),
          spreadTemplateId: activeSpread.id,
          spreadName: activeSpread.name,
          customPositions: [],
          performedAt: draftRes.data.performedAt,
          status: "completed",
          questionIntention: draftRes.data.questionIntention,
          sessionContext: draftRes.data.sessionContext,
          generalObservations:
            "Lectura completada y validada en el tutorial interactivo.",
          sessionSynthesis:
            "Primera práctica concluida con éxito en Grimorio Tarot.",
          closingReflections: "",
          tags: [],
          cards: cardsToPersist,
        });
      }

      toast.success("¡Tu lectura fue guardada en el historial con éxito!");
      onReadingCreated(readingId);
      onContinue();
    } catch {
      toast.error("Ocurrió un error al persistir la lectura.");
    } finally {
      setIsSavingReading(false);
    }
  };

  const filteredCards = React.useMemo(() => {
    const q = searchCardTerm.toLowerCase().trim();
    if (!q) return canonicalCards.slice(0, 24);
    return canonicalCards
      .filter(
        (c) =>
          c.canonicalName.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          c.traditionalKeywords.some((kw) => kw.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [canonicalCards, searchCardTerm]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Pill Stepper superior */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-tight">
            Puedes registrar una lectura que hayas realizado anteriormente o preparar una nueva ahora mismo
          </h2>
          <p className="text-sm text-muted">
            {selectedDeck
              ? `Mazo predeterminado: ${selectedDeck.name}`
              : "Exploración libre sin mazo predefinido"}
          </p>
        </div>

        {/* Pill Stepper Animado 1/2 y 2/2 */}
        <div className="shrink-0 self-start sm:self-center">
          <PillStepper
            currentSubstep={substep}
            onSelectSubstep={(s) => handleSelectSubstep(s)}
          />
        </div>
      </div>

      <div
        key={substep}
        className={cn(
          "w-full",
          subDirection === "forward" ? "t-slide-forward" : "t-slide-backward"
        )}
      >
        {/* SUBETAPA 1/2: PARA QUIÉN ES LA LECTURA */}
        {substep === 1 && (
          <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-ink">
              1. Selecciona el destinatario de la lectura
            </h3>
            <p className="text-xs text-muted">
              Indica si la sesión es para ti mismo, una lectura de estudio sin consultante o para una persona específica.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Destinatario de la lectura"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* Opción Para mí */}
            <button
              type="button"
              role="radio"
              aria-checked={localTargetType === "for_me"}
              onClick={() => handleSelectTarget("for_me", null)}
              className={cn(
                "t-card-interactive group flex flex-col justify-between rounded-xl border p-4 text-left transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent",
                localTargetType === "for_me"
                  ? "border-accent bg-accent/5 ring-1 ring-accent/60 shadow-xs"
                  : "border-border bg-surface hover:border-border-hover hover:bg-surface-raised"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg border",
                      localTargetType === "for_me"
                        ? "border-accent/30 bg-accent/10 text-accent"
                        : "border-border bg-ground text-muted"
                    )}
                  >
                    <User className="size-5" />
                  </div>

                  <div
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border transition-colors",
                      localTargetType === "for_me"
                        ? "border-accent bg-accent text-on-primary"
                        : "border-border bg-ground opacity-40 group-hover:opacity-80"
                    )}
                  >
                    {localTargetType === "for_me" && (
                      <Check className="size-3 stroke-[2.5]" />
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-serif text-lg font-medium text-ink">
                    Para mí
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Lectura personal de autoindagación, práctica o bitácora reflexiva a nombre de {userFullName}.
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/50 text-[11px] text-muted">
                Registro privado sin consultante externo
              </div>
            </button>

            {/* Opción Sin consultante */}
            <button
              type="button"
              role="radio"
              aria-checked={localTargetType === "no_consultant"}
              onClick={() => handleSelectTarget("no_consultant", null)}
              className={cn(
                "t-card-interactive group flex flex-col justify-between rounded-xl border p-4 text-left transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent",
                localTargetType === "no_consultant"
                  ? "border-accent bg-accent/5 ring-1 ring-accent/60 shadow-xs"
                  : "border-border bg-surface hover:border-border-hover hover:bg-surface-raised"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg border",
                      localTargetType === "no_consultant"
                        ? "border-accent/30 bg-accent/10 text-accent"
                        : "border-border bg-ground text-muted"
                    )}
                  >
                    <UserX className="size-5" />
                  </div>

                  <div
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border transition-colors",
                      localTargetType === "no_consultant"
                        ? "border-accent bg-accent text-on-primary"
                        : "border-border bg-ground opacity-40 group-hover:opacity-80"
                    )}
                  >
                    {localTargetType === "no_consultant" && (
                      <Check className="size-3 stroke-[2.5]" />
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-serif text-lg font-medium text-ink">
                    Sin consultante
                  </h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Estudio de naipes, ejercicios de tiradas de prueba o lectura libre no vinculada a una persona.
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/50 text-[11px] text-muted">
                Mesa libre para análisis o docencia
              </div>
            </button>

            {/* Consultantes registrados (si existen) */}
            {consultants.map((c) => {
              const isSelected =
                localTargetType === "consultant" &&
                localConsultantId === c.id;

              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectTarget("consultant", c.id)}
                  className={cn(
                    "t-card-interactive group flex flex-col justify-between rounded-xl border p-4 text-left transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isSelected
                      ? "border-accent bg-accent/5 ring-1 ring-accent/60 shadow-xs"
                      : "border-border bg-surface hover:border-border-hover hover:bg-surface-raised"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className="flex size-10 items-center justify-center rounded-full text-xs font-semibold text-white shadow-2xs"
                        style={{
                          backgroundColor: `hsl(${c.avatarHue}, 45%, 38%)`,
                        }}
                      >
                        {c.displayName.slice(0, 2).toUpperCase()}
                      </div>

                      <div
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full border transition-colors",
                          isSelected
                            ? "border-accent bg-accent text-on-primary"
                            : "border-border bg-ground opacity-40 group-hover:opacity-80"
                        )}
                      >
                        {isSelected && (
                          <Check className="size-3 stroke-[2.5]" />
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-serif text-lg font-medium text-ink">
                        {c.displayName}
                      </h4>
                      <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                        {c.contextNotes || "Consultante registrado en tu agenda."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/50 text-[11px] text-muted">
                    Sesión vinculada al expediente
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="primary"
              disabled={!localTargetType}
              onClick={() => handleSelectSubstep(2)}
              className="gap-2"
            >
              <span>Avanzar a mesa de cartas (2/2)</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* SUBETAPA 2/2: GESTIONAR CARTAS Y ESTRUCTURAS */}
      {substep === 2 && (
        <div className="space-y-6">
          {/* Fila de controles de la estructura */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
            <div className="space-y-1">
              <span className="text-xs text-muted font-medium">
                Estructura activa
              </span>
              <h3 className="font-serif text-lg text-ink font-medium">
                {activeSpread.name}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-sans">
                {slots.filter((s) => Boolean(s.card)).length} de {slots.length} naipes colocados
              </Badge>
            </div>
          </div>

          {/* MESA DE TRABAJO INTERACTIVA */}
          <div className="rounded-xl border border-border bg-ground p-4 sm:p-6 space-y-6 shadow-xs">
            <div className="text-center sm:text-left space-y-1">
              <h4 className="text-sm font-semibold text-ink">
                Mesa de tirada interactiva
              </h4>
              <p className="text-xs text-muted">
                Haz clic en cualquier posición para colocar una carta del catálogo, ver su significado
                o intercambiar lugares.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {slots.map((slot) => {
                const hasCard = slot.card !== null;

                return (
                  <div
                    key={slot.positionIndex}
                    className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 space-y-4 shadow-2xs"
                  >
                    {/* Cabecera del Slot */}
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-muted font-medium">
                        Posición {slot.positionIndex}
                      </span>
                      <h5 className="font-medium text-sm text-ink">
                        {slot.title}
                      </h5>
                      <p className="text-xs text-muted italic">
                        {slot.prompt}
                      </p>
                    </div>

                    {/* Naipe o espacio vacío */}
                    <div className="flex flex-col items-center justify-center py-2">
                      {hasCard ? (
                        <div className="space-y-2 text-center">
                          <TarotCardPlate
                            card={slot.card!}
                            orientation={slot.orientation}
                            size="md"
                            className="cursor-pointer"
                          />
                          <div className="space-y-1">
                            <span className="font-serif text-sm font-medium text-ink block">
                              {slot.card!.canonicalName}
                            </span>
                            <span className="text-[11px] text-muted">
                              {slot.orientation === "upright"
                                ? "Al derecho"
                                : "Invertida"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveSlotForCardPicker(slot.positionIndex)
                          }
                          className="flex flex-col items-center justify-center size-36 rounded-xl border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 transition-colors text-muted hover:text-ink gap-2 group"
                        >
                          <Plus className="size-6 stroke-[1.75] group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-medium">
                            Colocar carta
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Acciones y notas sobre la carta */}
                    {hasCard && (
                      <div className="space-y-3 pt-2 border-t border-border">
                        {/* Botones de acción del naipe */}
                        <div className="flex items-center justify-between gap-1 text-xs">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setActiveCardForMeaning(slot.card)
                            }
                            className="h-7 px-2 text-[11px] text-accent gap-1"
                            title="Consultar significado canónico"
                          >
                            <Info className="size-3" />
                            <span>Significado</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleToggleOrientation(slot.positionIndex)
                            }
                            className="h-7 px-2 text-[11px] text-muted hover:text-ink gap-1"
                            title="Girar orientación"
                          >
                            <RotateCcw className="size-3" />
                            <span>Girar</span>
                          </Button>

                          {/* Botón para intercambiar si hay al menos 2 cartas */}
                          {slots.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const nextIndex =
                                  slot.positionIndex === slots.length
                                    ? 1
                                    : slot.positionIndex + 1;
                                handleSwapSlots(slot.positionIndex, nextIndex);
                              }}
                              className="h-7 px-2 text-[11px] text-muted hover:text-ink gap-1"
                              title="Intercambiar con la siguiente posición"
                            >
                              <ArrowLeftRight className="size-3" />
                              <span>Mover</span>
                            </Button>
                          )}
                        </div>

                        {/* Campo de notas interpretativas contextuales */}
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted">
                            Interpretación en esta lectura
                          </Label>
                          <Textarea
                            value={slot.contextualNote}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSlots((prev) =>
                                prev.map((s) =>
                                  s.positionIndex === slot.positionIndex
                                    ? { ...s, contextualNote: val }
                                    : s
                                )
                              );
                            }}
                            placeholder="Anota qué te transmite esta carta aquí..."
                            className="text-xs min-h-[56px] py-1.5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botones de navegación y guardado real vs omitir */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleSelectSubstep(1)}
                className="gap-1.5 text-xs text-muted hover:text-ink"
              >
                <ChevronLeft className="size-4" />
                <span>Volver a destinatario</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={onSkip}
                className="text-xs text-muted hover:text-ink"
              >
                <span>Quizás más tarde</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                disabled={isSavingReading}
                onClick={handleSaveRealReading}
                className="gap-2"
              >
                <FileCheck2 className="size-4" />
                <span>
                  {isSavingReading
                    ? "Guardando lectura…"
                    : "Guardar lectura en mi historial"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* DIÁLOGO SELECTOR DE CARTA DEL CATÁLOGO REAL */}
      <Dialog
        open={activeSlotForCardPicker !== null}
        onOpenChange={(open) => !open && setActiveSlotForCardPicker(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Elegir carta del catálogo</DialogTitle>
            <DialogDescription>
              Selecciona el naipe correspondiente a la posición {activeSlotForCardPicker}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              placeholder="Buscar por nombre (ej. Loco, Estrella, Copas)..."
              value={searchCardTerm}
              onChange={(e) => setSearchCardTerm(e.target.value)}
              className="text-sm"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 pr-1">
            {filteredCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => handleAssignCard(card)}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-surface p-2 text-left hover:border-accent hover:bg-accent/5 transition-colors group"
              >
                <TarotCardPlate card={card} size="sm" />
                <div className="min-w-0">
                  <span className="text-xs font-medium text-ink block truncate group-hover:text-accent">
                    {card.canonicalName}
                  </span>
                  <span className="text-[10px] text-muted capitalize">
                    {card.arcana}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveSlotForCardPicker(null)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO PARA CONSULTAR SIGNIFICADO CANÓNICO */}
      <Dialog
        open={activeCardForMeaning !== null}
        onOpenChange={(open) => !open && setActiveCardForMeaning(null)}
      >
        <DialogContent className="sm:max-w-lg">
          {activeCardForMeaning && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <TarotCardPlate card={activeCardForMeaning} size="sm" />
                  <div>
                    <DialogTitle>{activeCardForMeaning.canonicalName}</DialogTitle>
                    <DialogDescription className="text-xs capitalize">
                      {activeCardForMeaning.arcana} · Tradición {activeCardForMeaning.deckTradition.toUpperCase()}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3 text-xs leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-1 rounded-md bg-surface p-3 border border-border">
                  <strong className="text-ink font-medium block">
                    Al derecho (Significado tradicional):
                  </strong>
                  <p className="text-muted">
                    {activeCardForMeaning.traditionalUpright}
                  </p>
                </div>

                <div className="space-y-1 rounded-md bg-surface p-3 border border-border">
                  <strong className="text-ink font-medium block">
                    Invertida:
                  </strong>
                  <p className="text-muted">
                    {activeCardForMeaning.traditionalReversed}
                  </p>
                </div>

                {activeCardForMeaning.archetypeNote && (
                  <div className="space-y-1 rounded-md bg-ground p-3 border border-border/80">
                    <strong className="text-ink font-medium block">
                      Nota arquetípica:
                    </strong>
                    <p className="text-muted italic">
                      {activeCardForMeaning.archetypeNote}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveCardForMeaning(null)}
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
