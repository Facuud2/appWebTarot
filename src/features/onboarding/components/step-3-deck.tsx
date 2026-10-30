"use client";

import * as React from "react";
import { Check, Compass, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DECK_TRADITION_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Deck, DeckTradition } from "@/types/domain";

interface Step3DeckProps {
  decks: Deck[];
  selectedDeckId: string | null;
  isExploringMode: boolean;
  onSelectDeck: (deckId: string | null, isExploring: boolean) => void;
  onDeckCreated: (newDeck: Deck) => void;
  onOpenCreateDeck?: () => void;
}

export function Step3Deck({
  decks,
  selectedDeckId,
  isExploringMode,
  onSelectDeck,
  onDeckCreated,
  onOpenCreateDeck,
}: Step3DeckProps) {
  // Deduplicación estricta para garantizar que cada mazo canónico o personalizado aparezca exactamente una vez
  const uniqueDecks = React.useMemo(() => {
    const seen = new Set<string>();
    return decks.filter((deck) => {
      const key = `${deck.tradition || "other"}:${deck.name.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [decks]);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Formulario de nuevo mazo
  const [deckName, setDeckName] = React.useState("");
  const [deckTradition, setDeckTradition] = React.useState<DeckTradition>("rws");
  const [deckAuthor, setDeckAuthor] = React.useState("");
  const [cardCount, setCardCount] = React.useState<number>(78);
  const [includeClassicStructure, setIncludeClassicStructure] =
    React.useState(true);
  const [deckDescription, setDeckDescription] = React.useState("");

  const handleCreateCustomDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = deckName.trim();
    if (!cleanName) {
      toast.error("Por favor, ingresa el nombre de tu mazo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { createDeckAction } = await import("@/actions/grimorio-actions");
      const res = await createDeckAction({
        name: cleanName,
        tradition: deckTradition,
        author: deckAuthor.trim(),
        cardCount: cardCount > 0 ? cardCount : 78,
        includeClassicStructure,
        description: deckDescription.trim(),
        isDefault: true,
      });

      if (!res.ok) {
        toast.error(res.error || "No se pudo registrar el mazo.");
        setIsSubmitting(false);
        return;
      }

      toast.success(`Mazo «${res.data.name}» agregado con éxito.`);
      onDeckCreated(res.data);
      setIsDialogOpen(false);
      setDeckName("");
      setDeckAuthor("");
      setDeckDescription("");
    } catch {
      toast.error("Ocurrió un error al registrar tu mazo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-tight">
          ¿Qué mazo utilizas con mayor frecuencia?
        </h2>
        <p className="text-sm text-muted">
          Tu elección servirá como mazo predeterminado para tus lecturas. Podrás cambiarlo
          o sumar nuevos mazos en cualquier momento.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Selección de mazo de tarot principal"
        className="grid gap-3 sm:grid-cols-2"
      >
        {uniqueDecks.map((deck) => {
          const isSelected = !isExploringMode && selectedDeckId === deck.id;

          return (
            <button
              key={deck.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectDeck(deck.id, false)}
              className={cn(
                "t-card-interactive group flex flex-col justify-between rounded-xl border p-4 text-left transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isSelected
                  ? "border-accent bg-accent/5 ring-1 ring-accent/60 shadow-xs"
                  : "border-border bg-surface hover:border-border-hover hover:bg-surface-raised"
              )}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-muted capitalize">
                      {DECK_TRADITION_LABELS[deck.tradition] ?? deck.tradition}
                    </span>
                    <h3 className="font-serif text-lg font-medium text-ink leading-snug">
                      {deck.name}
                    </h3>
                  </div>

                  <div
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                      isSelected
                        ? "border-accent bg-accent text-on-primary"
                        : "border-border bg-ground opacity-40 group-hover:opacity-80"
                    )}
                  >
                    {isSelected && <Check className="t-check-mark size-3 stroke-[2.5]" aria-hidden="true" />}
                  </div>
                </div>

                {deck.author && (
                  <p className="text-xs text-ink/80 italic font-serif">
                    {deck.author}
                  </p>
                )}

                <p className="text-xs text-muted leading-relaxed line-clamp-2">
                  {deck.description || `${deck.cardCount} cartas en la baraja.`}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted">
                <span>{deck.cardCount} naipes</span>
                {deck.isDefault && (
                  <span className="text-accent font-medium">Predeterminado</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Opciones especiales: Sumar mazo y Todavía estoy explorando */}
      <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border">
        {/* Opción Sumar mi propio mazo */}
        <button
          type="button"
          onClick={() => {
            onOpenCreateDeck?.();
            setIsDialogOpen(true);
          }}
          className="t-card-interactive flex items-center gap-3.5 rounded-xl border border-dashed border-border bg-ground p-4 text-left hover:border-accent hover:bg-accent/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-ink">
            <Plus className="size-4.5 stroke-[2]" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-ink">
              Sumar mi propio mazo
            </h3>
            <p className="text-xs text-muted">
              Registra una baraja física, edición especial o mazo propio.
            </p>
          </div>
        </button>

        {/* Opción Todavía estoy explorando */}
        <button
          type="button"
          role="radio"
          aria-checked={isExploringMode}
          onClick={() => onSelectDeck(null, true)}
          className={cn(
            "t-card-interactive flex items-center gap-3.5 rounded-xl border p-4 text-left transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent",
            isExploringMode
              ? "border-accent bg-accent/5 ring-1 ring-accent/60 shadow-xs"
              : "border-border bg-surface hover:border-border-hover hover:bg-surface-raised"
          )}
        >
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200",
              isExploringMode
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-border bg-ground text-muted"
            )}
          >
            <Compass className="size-4.5 stroke-[1.75]" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-ink">
                Todavía estoy explorando
              </h3>
              {isExploringMode && (
                <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-accent text-on-primary">
                  <Check className="t-check-mark size-3 stroke-[2.5]" aria-hidden="true" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted">
              Continuar sin mazo asignado; podrás definirlo cuando lo desees.
            </p>
          </div>
        </button>
      </div>

      <p className="text-center text-[11px] text-muted leading-relaxed">
        Al elegir un mazo continuarás automáticamente al siguiente paso. Si
        prefieres registrar el tuyo, usa «Sumar mi propio mazo» antes de elegir.
      </p>

      {/* Diálogo integrado para nuevo mazo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sumar mazo personalizado</DialogTitle>
            <DialogDescription>
              Añade los datos esenciales de tu baraja para que esté disponible en tu mesa de trabajo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomDeck} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-deck-name" requiredIndicator>
                Nombre del mazo
              </Label>
              <Input
                id="custom-deck-name"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Ej. Tarot Místico del Bosque"
                required
              />
            </div>

            <div className="grid grid-cols-[minmax(0,2fr)_minmax(6rem,1fr)] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="custom-deck-tradition">Tradición base</Label>
                <select
                  id="custom-deck-tradition"
                  value={deckTradition}
                  onChange={(e) => {
                    const tradition = e.target.value as DeckTradition;
                    setDeckTradition(tradition);
                    if (tradition === "other") setIncludeClassicStructure(true);
                  }}
                  className="w-full min-w-0 rounded-md border border-border bg-surface px-2 py-2 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="rws">Rider-Waite-Smith</option>
                  <option value="marseille">Tarot de Marsella</option>
                  <option value="thoth">Tarot de Thoth</option>
                  <option value="lenormand">Petit Lenormand</option>
                  <option value="living_wheel">Living Wheel</option>
                  <option value="other">Otra tradición u oráculo</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custom-deck-cards">Cantidad de naipes</Label>
                <Input
                  id="custom-deck-cards"
                  type="number"
                  min={1}
                  max={200}
                  value={cardCount}
                  onChange={(e) => setCardCount(Number(e.target.value))}
                />
              </div>
            </div>

            {deckTradition === "other" && cardCount === 78 ? (
              <label className="flex items-start gap-2 text-xs leading-relaxed text-ink">
                <Checkbox
                  checked={includeClassicStructure}
                  onCheckedChange={(checked) =>
                    setIncludeClassicStructure(checked === true)
                  }
                  className="mt-0.5"
                />
                <span>
                  Incluir estructura clásica de 78 arcanos (22 Mayores y 56
                  Menores) editable
                </span>
              </label>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="custom-deck-author">Autor / Creador (opcional)</Label>
              <Input
                id="custom-deck-author"
                value={deckAuthor}
                onChange={(e) => setDeckAuthor(e.target.value)}
                placeholder="Ej. Artista, taller o editorial"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-deck-desc">Notas o descripción</Label>
              <Textarea
                id="custom-deck-desc"
                value={deckDescription}
                onChange={(e) => setDeckDescription(e.target.value)}
                placeholder="Gramaje, estilo de corte o detalles de su uso..."
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Guardando…" : "Registrar mazo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
