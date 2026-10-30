"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { CardArtwork, getCardShortName } from "@/components/shared/tarot-card-plate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { compressAndStoreCardImage } from "@/lib/card-image-store";
import { DECK_TRADITION_LABELS, PHENOMENON_LABELS } from "@/lib/constants";
import type { CanonicalCard, CardOrientation, DeckPhase, PhenomenonType } from "@/types/domain";

export interface CardPreviewEvent {
  phenomenonType: PhenomenonType;
  customPhenomenonLabel?: string | null;
  occurredPhase?: DeckPhase;
  observationDescription: string;
  personalInterpretation: string;
}

export interface CardPreviewSlot {
  positionIndex: number;
  positionTitle: string;
  card: CanonicalCard | null;
  orientation: CardOrientation;
  observationNotes?: string;
  contextualInterpretation?: string;
  personalTakeaway?: string;
  events?: CardPreviewEvent[];
  staticImageUrl?: string | null;
}

interface CardPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: CardPreviewSlot | null;
  cards: CardPreviewSlot[];
  onNavigate: (positionIndex: number) => void;
  onNotesChange?: (
    positionIndex: number,
    field: "observationNotes" | "contextualInterpretation" | "personalTakeaway",
    value: string
  ) => void;
}

export function CardPreviewDialog({
  open,
  onOpenChange,
  slot,
  cards,
  onNavigate,
  onNotesChange,
}: CardPreviewDialogProps) {
  const [orientationState, setOrientationState] = React.useState<{
    positionIndex: number | null;
    orientation: CardOrientation;
  }>({ positionIndex: null, orientation: "upright" });
  const [isSavingImage, setIsSavingImage] = React.useState(false);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const cardIndex = slot ? cards.findIndex((entry) => entry.positionIndex === slot.positionIndex) : -1;

  if (!slot?.card) return null;
  const card = slot.card;

  const previewOrientation =
    orientationState.positionIndex === slot.positionIndex
      ? orientationState.orientation
      : slot.orientation;
  const previous = cards[cardIndex - 1];
  const next = cards[cardIndex + 1];
  const deckName =
    DECK_TRADITION_LABELS[slot.card.deckTradition as keyof typeof DECK_TRADITION_LABELS] ??
    slot.card.deckTradition;
  const updateNote = (
    field: "observationNotes" | "contextualInterpretation" | "personalTakeaway",
    value: string
  ) => onNotesChange?.(slot.positionIndex, field, value);
  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSavingImage(true);
    try {
      await compressAndStoreCardImage(card.deckTradition, card.id, file);
      toast.success("Imagen guardada en este dispositivo.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la imagen en este dispositivo."
      );
    } finally {
      setIsSavingImage(false);
      event.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.25rem)] max-w-2xl gap-3 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{getCardShortName(slot.card.canonicalName)}</DialogTitle>
          <DialogDescription>
            Posición {slot.positionIndex} · {slot.positionTitle} · {deckName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_1fr] sm:items-start">
          <div className="mx-auto w-36 sm:w-48">
            <div className="relative aspect-[3/5] overflow-hidden rounded-xl border border-border bg-ground">
              <CardArtwork
                card={slot.card}
                orientation={previewOrientation}
                staticFallbackUrl={slot.staticImageUrl}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label={
                previewOrientation === "reversed"
                  ? "Mostrar la carta al derecho"
                  : "Mostrar la carta invertida"
              }
              onClick={() =>
                setOrientationState({
                  positionIndex: slot.positionIndex,
                  orientation:
                    previewOrientation === "reversed" ? "upright" : "reversed",
                })
              }
              className="mt-2 w-full"
            >
              {previewOrientation === "reversed" ? "Ver al derecho" : "Ver invertida"}
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              aria-label="Seleccionar imagen para esta carta"
              className="sr-only"
              onChange={handleImageChange}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSavingImage}
              onClick={() => imageInputRef.current?.click()}
              className="w-full text-xs"
            >
              <ImagePlus className="size-3.5" aria-hidden="true" />
              {isSavingImage ? "Guardando imagen…" : "Cambiar imagen de esta carta"}
            </Button>
          </div>

          <div className="min-w-0 space-y-4">
            <section className="space-y-1">
              <h3 className="text-sm font-semibold text-ink">Significado base</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                {previewOrientation === "reversed"
                  ? slot.card.traditionalReversed
                  : slot.card.traditionalUpright}
              </p>
            </section>

            {slot.events?.length ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-ink">Fenómenos asociados</h3>
                {slot.events.map((event, index) => (
                  <div
                    key={`${event.phenomenonType}-${index}`}
                    className="space-y-1 rounded-lg bg-surface p-3 text-xs text-muted"
                  >
                    <p className="font-medium text-ink">
                      {event.customPhenomenonLabel ??
                        PHENOMENON_LABELS[event.phenomenonType]}
                      {event.occurredPhase
                        ? ` · ${event.occurredPhase.replaceAll("_", " ")}`
                        : ""}
                    </p>
                    {event.observationDescription ? (
                      <p>{event.observationDescription}</p>
                    ) : null}
                    {event.personalInterpretation ? (
                      <p>{event.personalInterpretation}</p>
                    ) : null}
                  </div>
                ))}
              </section>
            ) : null}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-ink">Notas de esta posición</h3>
              {(
                [
                  ["observationNotes", "Observación"],
                  ["contextualInterpretation", "Interpretación contextual"],
                  ["personalTakeaway", "Apunte para el Grimorio"],
                ] as const
              ).map(([field, label]) => {
                const value = slot[field] ?? "";
                if (!onNotesChange) {
                  return (
                    <div key={field} className="space-y-1">
                      <p className="text-xs font-medium text-muted">{label}</p>
                      {value ? (
                        <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                          {value}
                        </p>
                      ) : (
                        <p className="text-xs text-muted">
                          Sin notas para esta posición.
                        </p>
                      )}
                    </div>
                  );
                }
                return (
                  <VoiceTextarea
                    key={field}
                    id={`note-${field}`}
                    label={label}
                    labelClassName="text-xs font-medium text-muted"
                    fieldLabel={label.toLowerCase()}
                    rows={2}
                    value={value}
                    onChange={(next) => updateNote(field, next)}
                  />
                );
              })}
            </section>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="secondary"
            disabled={!previous}
            onClick={() => previous && onNavigate(previous.positionIndex)}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Carta anterior</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!next}
            onClick={() => next && onNavigate(next.positionIndex)}
          >
            <span>Carta siguiente</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
