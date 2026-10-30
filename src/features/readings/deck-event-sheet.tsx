"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { recordDeckEventAction } from "@/actions/reading-actions";
import { Button } from "@/components/ui/button";
import { CardCombobox } from "@/components/ui/card-combobox";
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
import { VoiceTextarea } from "@/components/ui/voice-textarea";
import { DECK_PHASE_LABELS } from "@/lib/constants";
import { cn, toDatetimeLocalValue } from "@/lib/utils";
import {
  deckEventFormSchema,
  type DeckEventFormValues,
} from "@/schemas/domain";
import type {
  CanonicalCard,
  DeckEvent,
  DeckPhase,
  PhenomenonType,
} from "@/types/domain";

interface DeckEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readingId: string;
  cards: CanonicalCard[];
  availablePositions: Array<{ positionIndex: number; positionTitle: string }>;
  tagSuggestions: string[];
  defaultPositionIndex?: number | null;
  defaultCardId?: string;
  onRecorded: (event: DeckEvent) => void;
}

const PHENOMENON_OPTIONS: Array<{
  type: PhenomenonType;
  label: string;
  icon: string;
  hint: string;
}> = [
  { type: "jumped", label: "Saltó al mezclar", icon: "⚡", hint: "Salió despedida" },
  { type: "fell_to_floor", label: "Cayó fuera", icon: "⤵️", hint: "Al suelo o mesa" },
  { type: "base_card", label: "Base del mazo", icon: "🎴", hint: "Carta inferior" },
  { type: "cut_reveal", label: "En el corte", icon: "✂️", hint: "Al partir el mazo" },
  { type: "spontaneous_turn", label: "Se dio vuelta", icon: "🔄", hint: "Invertida sola" },
  { type: "partially_hidden", label: "Quedó tapada", icon: "📑", hint: "Oculta bajo otra" },
  { type: "out_of_order", label: "Fuera de orden", icon: "↔️", hint: "Secuencia rota" },
  { type: "other", label: "Otra situación", icon: "✨", hint: "Personalizada" },
];

const PHASE_OPTIONS: DeckPhase[] = [
  "shuffling",
  "cutting",
  "dealing",
  "base_of_deck",
  "closing",
  "other",
];

export function DeckEventSheet({
  open,
  onOpenChange,
  readingId,
  cards,
  availablePositions,
  tagSuggestions,
  defaultPositionIndex = null,
  defaultCardId = "",
  onRecorded,
}: DeckEventSheetProps) {
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<DeckEventFormValues>({
    resolver: zodResolver(deckEventFormSchema),
    defaultValues: {
      readingId,
      cardId: defaultCardId,
      occurredPhase: "shuffling",
      phenomenonType: "jumped",
      customPhenomenonLabel: "",
      linkedPositionIndex: defaultPositionIndex,
      observationDescription: "",
      personalInterpretation: "",
      occurredAt: "",
      tags: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        readingId,
        cardId: defaultCardId,
        occurredPhase: "shuffling",
        phenomenonType: "jumped",
        customPhenomenonLabel: "",
        linkedPositionIndex: defaultPositionIndex,
        observationDescription: "",
        personalInterpretation: "",
        occurredAt: toDatetimeLocalValue(new Date().toISOString()),
        tags: [],
      });
    }
  }, [open, readingId, defaultCardId, defaultPositionIndex, form]);

  const selectedPhenomenon = useWatch({
    control: form.control,
    name: "phenomenonType",
  });
  const selectedCardId = useWatch({
    control: form.control,
    name: "cardId",
  });
  const selectedTags = useWatch({
    control: form.control,
    name: "tags",
  });
  const linkedPos = useWatch({
    control: form.control,
    name: "linkedPositionIndex",
  });
  const occurredAtValue = useWatch({
    control: form.control,
    name: "occurredAt",
  });
  const observationDescription = useWatch({
    control: form.control,
    name: "observationDescription",
  });
  const personalInterpretation = useWatch({
    control: form.control,
    name: "personalInterpretation",
  });

  const linkedPositionObj = availablePositions.find(
    (p) => p.positionIndex === linkedPos
  );

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = await recordDeckEventAction(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Evento del mazo registrado.");
      onRecorded(res.data);
      onOpenChange(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-xl md:max-w-2xl max-h-[90dvh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-lg font-semibold text-ink">
              Registrar evento del mazo
            </DialogTitle>
            {linkedPositionObj ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/15 text-accent border border-accent/25">
                Carta {linkedPositionObj.positionIndex}: {linkedPositionObj.positionTitle}
              </span>
            ) : null}
          </div>
          <DialogDescription className="text-xs text-muted">
            Anota qué ocurrió con las cartas durante la manipulación o mezcla; la interpretación es opcional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-1">
          {/* Phenomenon selection grid */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-ink">Tipo de evento</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PHENOMENON_OPTIONS.map((opt) => {
                const active = selectedPhenomenon === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() =>
                      form.setValue("phenomenonType", opt.type, {
                        shouldDirty: true,
                      })
                    }
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all",
                      active
                        ? "border-accent bg-accent/10 text-ink ring-1 ring-accent"
                        : "border-border bg-surface text-muted hover:border-subtle hover:text-ink"
                    )}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="text-sm select-none">{opt.icon}</span>
                      <span className="text-xs font-semibold leading-tight line-clamp-1">
                        {opt.label}
                      </span>
                    </div>
                    <span className="text-[10.5px] text-muted line-clamp-1">
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedPhenomenon === "other" ? (
            <div className="space-y-1.5 t-page-enter">
              <Label htmlFor="event-custom-label">
                Nombre breve del evento
              </Label>
              <Input
                id="event-custom-label"
                placeholder="Ej. Dos cartas pegadas entre sí…"
                {...form.register("customPhenomenonLabel")}
              />
            </div>
          ) : null}

          {/* Context: Phase & Position */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-phase">Momento del manejo</Label>
              <select
                id="event-phase"
                className="flex h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                {...form.register("occurredPhase")}
              >
                {PHASE_OPTIONS.map((phase) => (
                  <option key={phase} value={phase}>
                    {DECK_PHASE_LABELS[phase]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-position">Posición vinculada (opcional)</Label>
              <select
                id="event-position"
                value={linkedPos === null ? "" : String(linkedPos)}
                onChange={(e) => {
                  const val = e.target.value;
                  form.setValue(
                    "linkedPositionIndex",
                    val === "" ? null : Number(val),
                    { shouldDirty: true }
                  );
                }}
                className="flex h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Fuera de posición / General</option>
                {availablePositions.map((p) => (
                  <option key={p.positionIndex} value={String(p.positionIndex)}>
                    Carta {p.positionIndex}: {p.positionTitle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Card involved */}
          <div className="space-y-1.5">
            <Label htmlFor="event-card">
              Carta involucrada <span className="text-muted font-normal">(opcional)</span>
            </Label>
            <CardCombobox
              id="event-card"
              cards={cards}
              value={selectedCardId}
              onChange={(cardId) =>
                form.setValue("cardId", cardId, { shouldDirty: true })
              }
              placeholder="Seleccionar carta involucrada…"
              allowClear
            />
          </div>

          {/* Description of what happened */}
          <VoiceTextarea
            id="event-observation"
            label="1. Qué ocurrió en la mesa"
            fieldLabel="descripción del evento"
            rows={2}
            value={observationDescription ?? ""}
            onChange={(next) =>
              form.setValue("observationDescription", next, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            error={form.formState.errors.observationDescription?.message}
            placeholder="Qué pasó exactamente: cómo cayó, hacia dónde miraba la figura, sobre qué otra carta quedó…"
          />

          {/* Personal interpretation */}
          <VoiceTextarea
            id="event-interpretation"
            label={
              <>
                2. Significado o interpretación en la sesión{" "}
                <span className="text-muted font-normal">(opcional)</span>
              </>
            }
            fieldLabel="interpretación del evento"
            rows={2}
            value={personalInterpretation ?? ""}
            onChange={(next) =>
              form.setValue("personalInterpretation", next, {
                shouldDirty: true,
              })
            }
            placeholder="Qué lectura o sentido le diste dentro de esta consulta…"
          />

          {/* DateTime & Tags */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-occurred-at">Fecha y hora</Label>
              <DateTimePicker
                id="event-occurred-at"
                value={occurredAtValue}
                onChange={(val) =>
                  form.setValue("occurredAt", val, { shouldValidate: true })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-tags">Etiquetas del evento</Label>
              <TagInput
                id="event-tags"
                value={selectedTags}
                onChange={(next) =>
                  form.setValue("tags", next, { shouldDirty: true })
                }
                suggestions={tagSuggestions}
                placeholder="Ej. mezcla rápida, insistencia…"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
