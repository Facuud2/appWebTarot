"use client";

import * as React from "react";
import {
  Check,
  GripHorizontal,
  Hand,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CardPreviewDialog,
  type CardPreviewEvent,
} from "@/components/shared/card-preview-dialog";
import { CardArtwork, getCardShortName } from "@/components/shared/tarot-card-plate";
import { cn } from "@/lib/utils";
import type {
  CanonicalCard,
  CardOrientation,
  SpreadPositionDefinition,
} from "@/types/domain";

export interface SpreadMapSlot {
  positionIndex: number;
  positionTitle: string;
  card: CanonicalCard | null;
  orientation: CardOrientation;
  coordX: number;
  coordY: number;
  hasEvent?: boolean;
  observationNotes?: string;
  contextualInterpretation?: string;
  personalTakeaway?: string;
  events?: CardPreviewEvent[];
  staticImageUrl?: string | null;
}

interface SpreadMapProps {
  slots: SpreadMapSlot[];
  activePositionIndex?: number | null;
  onSelectPosition?: (positionIndex: number) => void;
  editable?: boolean;
  onMovePosition?: (
    positionIndex: number,
    coordX: number,
    coordY: number
  ) => void;
  onPreviewNotesChange?: (
    positionIndex: number,
    field: "observationNotes" | "contextualInterpretation" | "personalTakeaway",
    value: string
  ) => void;
  defaultHeight?: number;
  children?: React.ReactNode;
}

const MIN_PANEL_HEIGHT = 220;
const MAX_PANEL_HEIGHT = 640;
const RESIZE_STEP = 70;
const EXPANDED_HEIGHT = 520;

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function buildSpreadSlots(
  templatePositions: SpreadPositionDefinition[] | undefined,
  cards: Array<{
    positionIndex: number;
    positionTitle: string;
    card: CanonicalCard | null;
    orientation: CardOrientation;
    coordX?: number;
    coordY?: number;
    observationNotes?: string;
    contextualInterpretation?: string;
    personalTakeaway?: string;
    events?: CardPreviewEvent[];
    staticImageUrl?: string | null;
  }>,
  eventPositions: Set<number>
): SpreadMapSlot[] {
  if (
    cards.length === 0 &&
    (!templatePositions || templatePositions.length === 0)
  ) {
    return [];
  }

  const count = Math.max(cards.length, templatePositions?.length ?? 0);
  const result: SpreadMapSlot[] = [];

  for (let i = 0; i < count; i += 1) {
    const idx = i + 1;
    const cardEntry = cards.find((c) => c.positionIndex === idx);
    const tpl = templatePositions?.find((p) => p.positionIndex === idx);

    const fallbackCols = Math.min(count, 5);
    const row = Math.floor(i / fallbackCols);
    const col = i % fallbackCols;
    const totalRows = Math.ceil(count / fallbackCols);
    const fallbackX =
      fallbackCols === 1 ? 50 : 18 + (col * 64) / (fallbackCols - 1);
    const fallbackY =
      totalRows === 1 ? 50 : 26 + (row * 48) / (totalRows - 1);

    result.push({
      positionIndex: idx,
      positionTitle:
        cardEntry?.positionTitle || tpl?.title || `Carta ${idx}`,
      card: cardEntry?.card ?? null,
      orientation: cardEntry?.orientation ?? "upright",
      coordX: cardEntry?.coordX ?? tpl?.coordX ?? fallbackX,
      coordY: cardEntry?.coordY ?? tpl?.coordY ?? fallbackY,
      hasEvent: eventPositions.has(idx),
      observationNotes: cardEntry?.observationNotes,
      contextualInterpretation: cardEntry?.contextualInterpretation,
      personalTakeaway: cardEntry?.personalTakeaway,
      events: cardEntry?.events,
      staticImageUrl: cardEntry?.staticImageUrl,
    });
  }

  return result;
}

export function SpreadMap({
  slots,
  activePositionIndex,
  onSelectPosition,
  editable = false,
  onMovePosition,
  onPreviewNotesChange,
  defaultHeight,
  children,
}: SpreadMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const computedDefaultHeight =
    defaultHeight ?? (slots.length >= 7 ? 380 : 320);

  const [panelHeight, setPanelHeight] = React.useState<number>(
    computedDefaultHeight
  );
  const [mobileMoveEnabled, setMobileMoveEnabled] = React.useState(false);
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
  const [isResizingPanel, setIsResizingPanel] = React.useState(false);
  const [previewPositionIndex, setPreviewPositionIndex] = React.useState<number | null>(null);

  const pointerStartRef = React.useRef<{
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const resizeStartRef = React.useRef<{
    startY: number;
    startHeight: number;
  } | null>(null);

  React.useEffect(() => {
    if (draggingIndex === null && !isResizingPanel) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const preventDefaultTouch = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    window.addEventListener("touchmove", preventDefaultTouch, {
      passive: false,
    });
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener("touchmove", preventDefaultTouch);
    };
  }, [draggingIndex, isResizingPanel]);

  if (slots.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex h-44 flex-col items-center justify-center gap-1.5 px-4 text-center">
          <p className="text-sm font-medium text-ink">
            Agrega tu primera carta a la estructura
          </p>
          <p className="max-w-xs text-xs text-muted">
            Usa los controles de abajo para añadir posiciones y acomodarlas en la mesa.
          </p>
        </div>
        {children ? (
          <div className="border-t border-border bg-ground p-3 sm:p-4">
            {children}
          </div>
        ) : null}
      </div>
    );
  }

  const computeCoordsFromClient = (
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.round(clamp(rawX, 9, 91) * 10) / 10,
      y: Math.round(clamp(rawY, 14, 86) * 10) / 10,
    };
  };

  const isExpanded = panelHeight >= EXPANDED_HEIGHT - 20;
  const cardSizeClass =
    panelHeight < 280
      ? "w-11 h-[70px] sm:w-12 sm:h-[78px] p-1.5"
      : panelHeight >= 450
        ? "w-[60px] h-[96px] sm:w-[74px] sm:h-[118px] p-2"
        : "w-[50px] h-[80px] sm:w-[60px] sm:h-[96px] p-1.5 sm:p-2";

  const activeSlot =
    slots.find((s) => s.positionIndex === activePositionIndex) ?? null;
  const previewSlot =
    slots.find((s) => s.positionIndex === previewPositionIndex) ?? null;

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    resizeStartRef.current = {
      startY: e.clientY,
      startHeight: panelHeight,
    };
    setIsResizingPanel(true);
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingPanel || !resizeStartRef.current) return;
    const deltaY = e.clientY - resizeStartRef.current.startY;
    const nextHeight = clamp(
      Math.round(resizeStartRef.current.startHeight + deltaY),
      MIN_PANEL_HEIGHT,
      MAX_PANEL_HEIGHT
    );
    setPanelHeight(nextHeight);
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isResizingPanel) {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }
      resizeStartRef.current = null;
      setIsResizingPanel(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-ground">
      {/* Top Panel Control Bar: Instructions / Selected Card + Resize Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {editable && onMovePosition ? (
            <>
              <Button
                type="button"
                size="sm"
                variant={mobileMoveEnabled ? "primary" : "secondary"}
                aria-pressed={mobileMoveEnabled}
                onClick={() => setMobileMoveEnabled((prev) => !prev)}
                className="sm:hidden h-7 px-2.5 text-xs shrink-0"
              >
                {mobileMoveEnabled ? (
                  <>
                    <Check className="size-3.5" aria-hidden="true" />
                    <span>Terminar de mover</span>
                  </>
                ) : (
                  <>
                    <Hand className="size-3.5" aria-hidden="true" />
                    <span>Mover cartas</span>
                  </>
                )}
              </Button>
              <p className="min-w-0 truncate text-xs text-muted">
                {activeSlot ? (
                  <>
                    <span className="font-medium text-ink num-tabular">
                      {activeSlot.positionIndex}. {activeSlot.positionTitle}
                    </span>
                    {activeSlot.card ? ` · ${activeSlot.card.canonicalName}` : ""}
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">
                      Arrastra las cartas para acomodarlas en la mesa.
                    </span>
                    <span className="sm:hidden">
                      {mobileMoveEnabled
                        ? "Arrastra cualquier carta con el dedo."
                        : "Pulsa una carta o activa «Mover cartas»."}
                    </span>
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="min-w-0 truncate text-xs text-muted">
              {activeSlot ? (
                <>
                  <span className="font-medium text-ink num-tabular">
                    {activeSlot.positionIndex}. {activeSlot.positionTitle}
                  </span>
                  {activeSlot.card ? ` · ${activeSlot.card.canonicalName}` : ""}
                </>
              ) : (
                <span className="num-tabular">
                  {slots.length} {slots.length === 1 ? "carta en mesa" : "cartas en mesa"}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Panel Size Controls (Shrink / Enlarge / Toggle Expand) */}
        <div
          role="group"
          aria-label="Tamaño del panel de la mesa"
          className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-ground p-0.5"
        >
          <button
            type="button"
            disabled={panelHeight <= MIN_PANEL_HEIGHT}
            onClick={() =>
              setPanelHeight((h) =>
                clamp(h - RESIZE_STEP, MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT)
              )
            }
            aria-label="Achicar panel de cartas"
            title="Achicar panel"
            className="inline-flex size-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-35"
          >
            <Minus className="size-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            disabled={panelHeight >= MAX_PANEL_HEIGHT}
            onClick={() =>
              setPanelHeight((h) =>
                clamp(h + RESIZE_STEP, MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT)
              )
            }
            aria-label="Agrandar panel de cartas"
            title="Agrandar panel"
            className="inline-flex size-6 items-center justify-center rounded text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-35"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-pressed={isExpanded}
            aria-label={
              isExpanded
                ? "Contraer panel de cartas"
                : "Ampliar panel de cartas"
            }
            title={isExpanded ? "Tamaño normal" : "Ampliar mesa"}
            onClick={() =>
              setPanelHeight(isExpanded ? computedDefaultHeight : EXPANDED_HEIGHT)
            }
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded px-1.5 text-[11px] font-medium transition-colors",
              isExpanded
                ? "bg-surface text-ink"
                : "text-muted hover:bg-surface hover:text-ink"
            )}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="size-3" aria-hidden="true" />
                <span className="hidden sm:inline">Normal</span>
              </>
            ) : (
              <>
                <Maximize2 className="size-3" aria-hidden="true" />
                <span className="hidden sm:inline">Ampliar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Table Surface with Rectangular Rounded Tarot Cards */}
      <div
        ref={containerRef}
        style={{ height: `${panelHeight}px` }}
        className={cn(
          "relative w-full overflow-hidden bg-surface/60 select-none transition-[border-color]",
          editable && (mobileMoveEnabled || draggingIndex !== null)
            ? "touch-none"
            : "touch-pan-y"
        )}
        role="region"
        aria-label="Ubicación de las cartas en la mesa"
      >
        {/* Subtle table mat inner guide */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-2.5 rounded-xl border transition-colors",
            editable && mobileMoveEnabled
              ? "border-accent/50"
              : "border-border/50"
          )}
        />

        {slots.map((slot) => {
          const isSelected = activePositionIndex === slot.positionIndex;
          const isReversed = slot.orientation === "reversed";
          const isDragging = draggingIndex === slot.positionIndex;

          const handlePointerDown = (
            e: React.PointerEvent<HTMLButtonElement>
          ) => {
            if (!editable || !onMovePosition) return;
            const isMouse = e.pointerType === "mouse";
            if (!isMouse && !mobileMoveEnabled) return;
            if (isMouse && e.button !== 0) return;

            e.preventDefault();
            e.stopPropagation();
            try {
              e.currentTarget.setPointerCapture?.(e.pointerId);
            } catch {
              // ignore
            }
            pointerStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              moved: false,
            };
            setDraggingIndex(slot.positionIndex);
          };

          const handlePointerMove = (
            e: React.PointerEvent<HTMLButtonElement>
          ) => {
            if (
              draggingIndex !== slot.positionIndex ||
              !editable ||
              !onMovePosition
            ) {
              return;
            }

            e.preventDefault();
            if (pointerStartRef.current) {
              const dx = Math.abs(e.clientX - pointerStartRef.current.x);
              const dy = Math.abs(e.clientY - pointerStartRef.current.y);
              if (dx > 3 || dy > 3) {
                pointerStartRef.current.moved = true;
              }
            }

            const coords = computeCoordsFromClient(e.clientX, e.clientY);
            if (coords) {
              onMovePosition(slot.positionIndex, coords.x, coords.y);
            }
          };

          const handlePointerUpOrCancel = (
            e: React.PointerEvent<HTMLButtonElement>
          ) => {
            if (draggingIndex === slot.positionIndex) {
              if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                e.currentTarget.releasePointerCapture?.(e.pointerId);
              }
              setDraggingIndex(null);
            }
          };

          const handleClick = () => {
            if (pointerStartRef.current?.moved) {
              pointerStartRef.current = null;
              return;
            }
            pointerStartRef.current = null;
            onSelectPosition?.(slot.positionIndex);
            if (slot.card && !mobileMoveEnabled) {
              setPreviewPositionIndex(slot.positionIndex);
            }
          };

          return (
            <button
              key={slot.positionIndex}
              type="button"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpOrCancel}
              onPointerCancel={handlePointerUpOrCancel}
              onClick={handleClick}
              style={{
                left: `${slot.coordX}%`,
                top: `${slot.coordY}%`,
              }}
              aria-pressed={isSelected}
              aria-label={`Carta ${slot.positionIndex}: ${slot.positionTitle}${slot.card ? `, ${slot.card.canonicalName}` : ", sin carta"}`}
              className={cn(
                "group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col overflow-hidden rounded-xl border text-center transition-[border-color,transform]",
                cardSizeClass,
                editable && "cursor-grab touch-none",
                isDragging &&
                  "z-30 scale-105 border-accent ring-2 ring-accent/40 cursor-grabbing touch-none",
                slot.card
                  ? "bg-ground border-control text-ink hover:border-ink/60"
                  : "bg-ground/95 border-border text-muted hover:border-control hover:text-ink",
                isSelected &&
                  !isDragging &&
                  "z-20 border-accent ring-2 ring-accent scale-[1.06] ring-offset-1 ring-offset-ground",
                isReversed && slot.card && "border-b-2 border-b-warning"
              )}
            >
              {isSelected ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[8px] font-semibold text-on-primary shadow-xs tracking-wider uppercase animate-in fade-in zoom-in-95 duration-150"
                >
                  Activa
                </span>
              ) : null}

              <div className="relative min-h-0 flex-[72] w-full overflow-hidden bg-ground">
                {slot.card ? (
                  <CardArtwork
                    card={slot.card}
                    orientation={slot.orientation}
                    staticFallbackUrl={slot.staticImageUrl}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-1 text-[9px] text-muted">
                    Sin carta
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-1 top-1 z-10 flex items-center justify-between gap-0.5 text-[10px] leading-none num-tabular">
                  <span
                    className={cn(
                      "inline-flex min-w-4 items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-semibold",
                      isSelected
                        ? "bg-accent text-on-primary"
                        : "bg-surface text-ink"
                    )}
                  >
                    {slot.positionIndex}
                  </span>
                  {slot.hasEvent ? (
                    <Zap
                      className="size-3 shrink-0 rounded bg-ground/90 p-px text-accent"
                      aria-label="Evento del mazo asociado"
                    />
                  ) : slot.card?.romanNumeral ? (
                    <span className="rounded bg-ground/90 px-0.5 text-[9px] text-muted truncate">
                      {slot.card.romanNumeral}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="relative z-10 flex min-h-0 flex-[28] w-full items-center justify-center gap-0.5 px-1 py-0.5">
                <p
                  className={cn(
                    "line-clamp-2 min-w-0 break-words leading-[1.05]",
                    slot.card
                      ? "font-serif text-[10px] sm:text-[11px] font-medium text-ink"
                      : "text-[9.5px] sm:text-[10px] font-medium text-ink/80"
                  )}
                >
                  {slot.card
                    ? getCardShortName(slot.card.canonicalName)
                    : slot.positionTitle}
                </p>
                {slot.card && isReversed ? (
                  <span className="shrink-0 text-[8px] font-medium leading-none text-warning">Inv.</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Drag Handle to Freely Shrink or Enlarge Panel Height */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Arrastrar para cambiar el alto del panel de cartas"
        title="Arrastra hacia arriba o abajo para achicar o agrandar la mesa (doble clic para restaurar)"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        onDoubleClick={() => setPanelHeight(computedDefaultHeight)}
        className={cn(
          "flex h-5 w-full cursor-ns-resize touch-none items-center justify-center border-t border-border bg-surface/80 text-muted transition-colors hover:bg-surface hover:text-ink",
          isResizingPanel && "bg-surface text-accent"
        )}
      >
        <GripHorizontal className="size-3.5" aria-hidden="true" />
      </div>

      {/* Unified Card Management Controls Slot Directly Below the Card Visualization */}
      {children ? (
        <div className="border-t border-border bg-ground p-3.5 sm:p-4">
          {children}
        </div>
      ) : null}
      <CardPreviewDialog
        open={previewPositionIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewPositionIndex(null);
        }}
        slot={previewSlot}
        cards={slots.filter((slot) => slot.card)}
        onNavigate={setPreviewPositionIndex}
        onNotesChange={onPreviewNotesChange}
      />
    </div>
  );
}
