"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { ImagePlus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { savePersonalCardEntryAction } from "@/actions/grimorio-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";
import { Textarea } from "@/components/ui/textarea";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";
import { TarotCardPlate } from "@/components/shared/tarot-card-plate";
import {
  compressAndStoreCardImage,
  removeStoredCardImage,
} from "@/lib/card-image-store";
import { DECK_TRADITION_LABELS } from "@/lib/constants";
import { formatDateTimeEs } from "@/lib/utils";
import { appendVoiceTranscript } from "@/lib/voice-normalizer";
import {
  personalCardEntrySchema,
  type PersonalCardEntryValues,
} from "@/schemas/domain";
import type { CanonicalCard, Deck, PersonalCardEntry } from "@/types/domain";

interface CardDetailEditorProps {
  card: CanonicalCard;
  personalEntries: PersonalCardEntry[];
  decks: Deck[];
  tagSuggestions: string[];
}

export function CardDetailEditor({
  card,
  personalEntries,
  decks,
  tagSuggestions,
}: CardDetailEditorProps) {
  const router = useRouter();
  const [selectedDeckId, setSelectedDeckId] = React.useState<string>("");
  const [isPending, startTransition] = React.useTransition();
  const [isSavingCardImage, setIsSavingCardImage] = React.useState(false);

  const matchingEntry = React.useMemo(() => {
    const normalized = selectedDeckId.trim() || null;
    return (
      personalEntries.find((entry) => entry.deckId === normalized) ?? null
    );
  }, [personalEntries, selectedDeckId]);

  const form = useForm<PersonalCardEntryValues>({
    resolver: zodResolver(personalCardEntrySchema),
    defaultValues: {
      cardId: card.id,
      deckId: "",
      customImageUrl: matchingEntry?.customImageUrl ?? "",
      personalMeaning: matchingEntry?.personalMeaning ?? "",
      reversedMeaning: matchingEntry?.reversedMeaning ?? "",
      symbolsAssociations: matchingEntry?.symbolsAssociations ?? "",
      keywords: matchingEntry?.keywords ?? [],
      reflections: matchingEntry?.reflections ?? "",
      tags: matchingEntry?.tags.map((t) => t.name) ?? [],
      logEvolutionEntry: false,
      evolutionNoteTitle: "",
    },
  });

  React.useEffect(() => {
    form.reset({
      cardId: card.id,
      deckId: selectedDeckId,
      customImageUrl: matchingEntry?.customImageUrl ?? "",
      personalMeaning: matchingEntry?.personalMeaning ?? "",
      reversedMeaning: matchingEntry?.reversedMeaning ?? "",
      symbolsAssociations: matchingEntry?.symbolsAssociations ?? "",
      keywords: matchingEntry?.keywords ?? [],
      reflections: matchingEntry?.reflections ?? "",
      tags: matchingEntry?.tags.map((t) => t.name) ?? [],
      logEvolutionEntry: false,
      evolutionNoteTitle: "",
    });
  }, [card.id, selectedDeckId, matchingEntry, form]);

  const watchedKeywords = useWatch({
    control: form.control,
    name: "keywords",
  });
  const watchedTags = useWatch({
    control: form.control,
    name: "tags",
  });
  const watchedLogEvolution = useWatch({
    control: form.control,
    name: "logEvolutionEntry",
  });

  const handleCardImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSavingCardImage(true);
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
      setIsSavingCardImage(false);
      event.target.value = "";
    }
  };

  const handleRemoveCardImage = async () => {
    setIsSavingCardImage(true);
    try {
      await removeStoredCardImage(card.deckTradition, card.id);
      toast.success("Se restableció la imagen arquetípica.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo quitar la imagen del dispositivo."
      );
    } finally {
      setIsSavingCardImage(false);
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const res = await savePersonalCardEntryAction(card.slug, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Notas personales guardadas.");
      form.setValue("logEvolutionEntry", false);
      form.setValue("evolutionNoteTitle", "");
      router.refresh();
    });
  });

  return (
    <section
      aria-labelledby="heading-mi-grimorio"
      className="min-w-0 rounded-xl border border-border bg-ground p-4 sm:p-6 space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="min-w-0 space-y-0.5">
          <h2
            id="heading-mi-grimorio"
            className="text-base font-semibold text-ink"
          >
            Mis notas y significado personal
          </h2>
          <p className="text-xs text-muted" suppressHydrationWarning>
            {matchingEntry
              ? `Última edición el ${formatDateTimeEs(matchingEntry.updatedAt)}`
              : "Sin notas propias guardadas todavía para este ámbito."}
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <Label htmlFor="entry-deck-scope" className="text-xs text-muted shrink-0">
            Ámbito:
          </Label>
          <select
            id="entry-deck-scope"
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            className="h-9 min-w-0 flex-1 sm:flex-initial rounded-lg border border-control bg-raised px-2.5 text-xs text-ink"
          >
            <option value="">General (todos mis mazos)</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                Solo en {d.name} ({DECK_TRADITION_LABELS[d.tradition]})
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center gap-4 rounded-lg bg-surface p-3">
          <TarotCardPlate
            card={card}
            variant="thumbnail"
            customImageUrl={matchingEntry?.customImageUrl}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="card-local-image">
              Imagen personal en este dispositivo
            </Label>
            <p className="text-xs text-muted">
              Se convierte a WebP y se conserva en el navegador, sin subirla a la base de datos.
            </p>
            <Input
              id="card-local-image"
              type="file"
              accept="image/*"
              onChange={handleCardImageChange}
              disabled={isSavingCardImage}
              className="h-auto min-h-10 py-2 text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                <ImagePlus className="size-3.5" aria-hidden="true" />
                {isSavingCardImage ? "Procesando imagen…" : "Almacenamiento local"}
              </span>
              <button
                type="button"
                onClick={handleRemoveCardImage}
                disabled={isSavingCardImage}
                className="inline-flex min-h-9 items-center gap-1 text-xs text-muted hover:text-ink disabled:opacity-50"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Quitar imagen local
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="card-personal-meaning">
              Significado personal al derecho
            </Label>
            <VoiceMicButton
              fieldLabel="significado personal"
              onTranscript={(chunk) =>
                form.setValue(
                  "personalMeaning",
                  appendVoiceTranscript(
                    form.getValues("personalMeaning"),
                    chunk
                  ),
                  { shouldDirty: true }
                )
              }
            />
          </div>
          <Textarea
            id="card-personal-meaning"
            rows={4}
            placeholder="Cómo se manifiesta esta carta en tu propia práctica, más allá de los manuales…"
            {...form.register("personalMeaning")}
          />
          {form.formState.errors.personalMeaning ? (
            <p className="text-xs text-negative">
              {form.formState.errors.personalMeaning.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="card-reversed-meaning">
              Lectura personal invertida o bloqueada
            </Label>
            <VoiceMicButton
              fieldLabel="lectura personal invertida"
              onTranscript={(chunk) =>
                form.setValue(
                  "reversedMeaning",
                  appendVoiceTranscript(
                    form.getValues("reversedMeaning"),
                    chunk
                  ),
                  { shouldDirty: true }
                )
              }
            />
          </div>
          <Textarea
            id="card-reversed-meaning"
            rows={3}
            placeholder="Cómo interpretas esta carta cuando aparece invertida o bloqueada…"
            {...form.register("reversedMeaning")}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="card-symbols">
              Símbolos, gestos y asociaciones visuales propias
            </Label>
            <VoiceMicButton
              fieldLabel="símbolos y asociaciones de la carta"
              onTranscript={(chunk) =>
                form.setValue(
                  "symbolsAssociations",
                  appendVoiceTranscript(
                    form.getValues("symbolsAssociations"),
                    chunk
                  ),
                  { shouldDirty: true }
                )
              }
            />
          </div>
          <Textarea
            id="card-symbols"
            rows={3}
            placeholder="Detalles visuales, colores, dirección de la mirada o escenas cotidianas asociadas…"
            {...form.register("symbolsAssociations")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="card-keywords">Palabras clave propias</Label>
          <TagInput
            id="card-keywords"
            value={watchedKeywords}
            onChange={(next) =>
              form.setValue("keywords", next, { shouldDirty: true })
            }
            placeholder="Añade conceptos breves de referencia rápida…"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="card-reflections">
              Notas de estudio y observaciones
            </Label>
            <VoiceMicButton
              fieldLabel="notas de estudio"
              onTranscript={(chunk) =>
                form.setValue(
                  "reflections",
                  appendVoiceTranscript(form.getValues("reflections"), chunk),
                  { shouldDirty: true }
                )
              }
            />
          </div>
          <Textarea
            id="card-reflections"
            rows={3}
            placeholder="Comparativas entre mazos, preguntas abiertas, combinaciones frecuentes con otras cartas…"
            {...form.register("reflections")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="card-tags">Etiquetas de la carta</Label>
            <TagInput
              id="card-tags"
              value={watchedTags}
              onChange={(next) =>
                form.setValue("tags", next, { shouldDirty: true })
              }
              suggestions={tagSuggestions}
              placeholder="Ej. decisiones, vínculos, trabajo…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-custom-image">
              Imagen propia o de dominio público{" "}
              <span className="text-muted font-normal">(URL opcional)</span>
            </Label>
            <Input
              id="card-custom-image"
              placeholder="https://… o /laminas/mi-carta.jpg"
              {...form.register("customImageUrl")}
            />
            {form.formState.errors.customImageUrl ? (
              <p className="text-xs text-negative">
                {form.formState.errors.customImageUrl.message}
              </p>
            ) : (
              <p className="text-[11px] text-muted">
                Usa únicamente fotografías propias o ediciones libres de derechos.
              </p>
            )}
          </div>
        </div>

        {/* Evolution Log Snapshot Option */}
        <div className="rounded-lg border border-border bg-surface p-3.5 space-y-2.5">
          <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer select-none">
            <Checkbox
              checked={watchedLogEvolution}
              onCheckedChange={(v) =>
                form.setValue("logEvolutionEntry", v === true)
              }
            />
            <span>
              Guardar también una nota fechada en el historial de cambios de esta carta
            </span>
          </label>

          {watchedLogEvolution ? (
            <div className="space-y-1 pt-1">
              <Label htmlFor="evolution-title" className="text-xs">
                Título breve de esta nota
              </Label>
              <Input
                id="evolution-title"
                placeholder="Ej. Nueva observación tras estudiar Marsella · Octubre"
                {...form.register("evolutionNoteTitle")}
              />
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end border-t border-border pt-4">
          <Button type="submit" variant="primary" disabled={isPending}>
            <Save className="size-4" aria-hidden="true" />
            <span>
              {isPending ? "Guardando…" : "Guardar notas personales"}
            </span>
          </Button>
        </div>
      </form>
    </section>
  );
}
