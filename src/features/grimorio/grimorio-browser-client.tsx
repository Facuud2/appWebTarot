"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import {
  BookMarked,
  Edit3,
  Layers,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createDeckAction,
  createSpreadTemplateAction,
  deleteDeckAction,
  deleteSpreadTemplateAction,
  updateDeckAction,
} from "@/actions/grimorio-actions";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DECK_TRADITION_LABELS, SUIT_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  deckFormSchema,
  spreadTemplateFormSchema,
  type DeckFormValues,
  type SpreadTemplateFormValues,
} from "@/schemas/domain";
import type {
  Deck,
  GrimorioCardSummary,
  SpreadTemplate,
  TarotSuit,
} from "@/types/domain";

type SuitOrArcanaFilter =
  | "all"
  | "major"
  | "wands"
  | "cups"
  | "swords"
  | "pentacles";

interface GrimorioBrowserClientProps {
  initialCards: GrimorioCardSummary[];
  initialDecks: Deck[];
  initialSpreads: SpreadTemplate[];
  defaultTab?: string;
  initialEditDeckId?: string;
}

export function GrimorioBrowserClient({
  initialCards,
  initialDecks,
  initialSpreads,
  defaultTab = "cartas",
  initialEditDeckId,
}: GrimorioBrowserClientProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [groupFilter, setGroupFilter] =
    React.useState<SuitOrArcanaFilter>("all");
  const [onlyAnnotated, setOnlyAnnotated] = React.useState(false);
  const [onlyPhenomena, setOnlyPhenomena] = React.useState(false);

  const initialTargetDeck = React.useMemo(
    () =>
      initialEditDeckId
        ? (initialDecks.find((d) => d.id === initialEditDeckId) ?? null)
        : null,
    [initialDecks, initialEditDeckId]
  );

  const [editingDeck, setEditingDeck] = React.useState<Deck | null>(
    initialTargetDeck
  );
  const [deckDialogOpen, setDeckDialogOpen] = React.useState(
    Boolean(initialTargetDeck)
  );
  const [spreadDialogOpen, setSpreadDialogOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const filteredCards = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialCards.filter((item) => {
      if (groupFilter === "major" && item.card.arcana !== "major") return false;
      if (
        groupFilter !== "all" &&
        groupFilter !== "major" &&
        item.card.suit !== groupFilter
      ) {
        return false;
      }

      const hasOwnNotes = Boolean(
        item.personalEntry &&
          (item.personalEntry.personalMeaning.trim().length > 0 ||
            item.personalEntry.reversedMeaning.trim().length > 0 ||
            item.personalEntry.symbolsAssociations.trim().length > 0 ||
            item.personalEntry.reflections.trim().length > 0 ||
            item.personalEntry.keywords.length > 0)
      );

      if (onlyAnnotated && !hasOwnNotes) return false;
      if (onlyPhenomena && item.phenomenaCount === 0) return false;

      if (q) {
        const haystack = [
          item.card.canonicalName,
          item.card.nameEn,
          ...(item.card.searchKeywords ?? []),
          item.card.romanNumeral ?? "",
          item.card.traditionalUpright,
          ...item.card.traditionalKeywords,
          item.personalEntry?.personalMeaning ?? "",
          item.personalEntry?.symbolsAssociations ?? "",
          ...(item.personalEntry?.keywords ?? []),
          ...(item.personalEntry?.tags.map((t) => t.name) ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [initialCards, query, groupFilter, onlyAnnotated, onlyPhenomena]);

  const annotatedTotal = React.useMemo(
    () =>
      initialCards.filter(
        (c) =>
          c.personalEntry &&
          (c.personalEntry.personalMeaning.trim().length > 0 ||
            c.personalEntry.keywords.length > 0 ||
            c.personalEntry.reflections.trim().length > 0)
      ).length,
    [initialCards]
  );

  // Deck Creation / Edition Form
  const deckForm = useForm<DeckFormValues>({
    resolver: zodResolver(deckFormSchema),
    defaultValues: initialTargetDeck
      ? {
          name: initialTargetDeck.name,
          tradition: initialTargetDeck.tradition,
          author: initialTargetDeck.author ?? "",
          cardCount: initialTargetDeck.cardCount,
          description: initialTargetDeck.description,
          isDefault: initialTargetDeck.isDefault,
        }
      : {
          name: "",
          tradition: "rws",
          author: "",
          cardCount: 78,
          description: "",
          isDefault: initialDecks.length === 0,
        },
  });

  const openCreateDeckDialog = () => {
    setEditingDeck(null);
    deckForm.reset({
      name: "",
      tradition: "rws",
      author: "",
      cardCount: 78,
      description: "",
      isDefault: initialDecks.length === 0,
    });
    setDeckDialogOpen(true);
  };

  const openEditDeckDialog = (deck: Deck) => {
    setEditingDeck(deck);
    deckForm.reset({
      name: deck.name,
      tradition: deck.tradition,
      author: deck.author ?? "",
      cardCount: deck.cardCount,
      description: deck.description,
      isDefault: deck.isDefault,
    });
    setDeckDialogOpen(true);
  };

  const deckIsDefault = useWatch({
    control: deckForm.control,
    name: "isDefault",
  });

  const onSaveDeck = deckForm.handleSubmit((values) => {
    startTransition(async () => {
      const res = editingDeck
        ? await updateDeckAction(editingDeck.id, values)
        : await createDeckAction(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.message ?? (editingDeck ? "Mazo actualizado." : "Mazo registrado.")
      );
      setDeckDialogOpen(false);
      setEditingDeck(null);
      deckForm.reset();
      router.refresh();
    });
  });

  const handleDeleteDeck = (deckId: string) => {
    startTransition(async () => {
      const res = await deleteDeckAction(deckId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Mazo eliminado.");
      router.refresh();
    });
  };

  // Custom Spread Creation Form
  const spreadForm = useForm<SpreadTemplateFormValues>({
    resolver: zodResolver(spreadTemplateFormSchema),
    defaultValues: {
      name: "",
      category: "Personalizada",
      description: "",
      positions: [
        {
          positionIndex: 1,
          title: "Situación actual",
          prompt: "Lo que se manifiesta en el presente",
          coordX: 25,
          coordY: 50,
        },
        {
          positionIndex: 2,
          title: "Puente o acción",
          prompt: "Recurso disponible para avanzar",
          coordX: 50,
          coordY: 50,
        },
        {
          positionIndex: 3,
          title: "Resultado probable",
          prompt: "Hacia dónde se dirige la consulta",
          coordX: 75,
          coordY: 50,
        },
      ],
    },
  });

  const { fields: posFields, append: appendPos, remove: removePos } =
    useFieldArray({
      control: spreadForm.control,
      name: "positions",
    });

  const watchedPositions = useWatch({
    control: spreadForm.control,
    name: "positions",
  });

  const onCreateSpread = spreadForm.handleSubmit((values) => {
    const normalized: SpreadTemplateFormValues = {
      ...values,
      positions: values.positions.map((p, idx) => ({
        ...p,
        positionIndex: idx + 1,
      })),
    };
    startTransition(async () => {
      const res = await createSpreadTemplateAction(normalized);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Estructura guardada.");
      setSpreadDialogOpen(false);
      spreadForm.reset();
      router.refresh();
    });
  });

  const handleDeleteSpread = (spreadId: string) => {
    startTransition(async () => {
      const res = await deleteSpreadTemplateAction(spreadId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Estructura eliminada.");
      router.refresh();
    });
  };

  return (
    <Tabs defaultValue={defaultTab} className="space-y-5">
      <TabsList aria-label="Secciones de cartas y mazos">
        <TabsTrigger value="cartas">
          <span>Las 78 cartas</span>
          <span className="text-xs text-muted num-tabular">
            ({annotatedTotal}/78 con notas)
          </span>
        </TabsTrigger>
        <TabsTrigger value="mazos">
          <span>Mis mazos</span>
          <span className="text-xs text-muted num-tabular">
            ({initialDecks.length})
          </span>
        </TabsTrigger>
        <TabsTrigger value="tiradas">
          <span>Estructuras de tirada</span>
          <span className="text-xs text-muted num-tabular">
            ({initialSpreads.length})
          </span>
        </TabsTrigger>
      </TabsList>

      {/* =========================================================
          TAB 1: LAS 78 CARTAS
         ========================================================= */}
      <TabsContent value="cartas" className="space-y-5">
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                aria-label="Buscar carta por nombre, símbolo o palabra clave"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre de carta, palabra clave o símbolo…"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-xs text-ink cursor-pointer select-none">
                <Checkbox
                  checked={onlyAnnotated}
                  onCheckedChange={(v) => setOnlyAnnotated(v === true)}
                />
                <span>Con notas propias</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs text-ink cursor-pointer select-none">
                <Checkbox
                  checked={onlyPhenomena}
                  onCheckedChange={(v) => setOnlyPhenomena(v === true)}
                />
                <span>Con eventos del mazo</span>
              </label>
            </div>
          </div>

          {/* Suit / Arcana Filter Row */}
          <div
            role="group"
            aria-label="Filtrar catálogo por grupo o palo"
            className="flex flex-wrap gap-1.5"
          >
            {(
              [
                { id: "all", label: "Todas (78)" },
                { id: "major", label: "Arcanos Mayores (22)" },
                { id: "wands", label: "Bastos (14)" },
                { id: "cups", label: "Copas (14)" },
                { id: "swords", label: "Espadas (14)" },
                { id: "pentacles", label: "Oros (14)" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setGroupFilter(opt.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors num-tabular",
                  groupFilter === opt.id
                    ? "border-ink bg-ground text-ink"
                    : "border-border bg-ground/50 text-muted hover:text-ink"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {filteredCards.length === 0 ? (
          <div className="rounded-xl border border-border bg-ground p-8 text-center space-y-2.5">
            <p className="text-sm font-medium text-ink">
              Ninguna carta coincide con el filtro actual.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery("");
                setGroupFilter("all");
                setOnlyAnnotated(false);
                setOnlyPhenomena(false);
              }}
            >
              Ver las 78 cartas
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCards.map((item) => {
              const hasPersonal = Boolean(
                item.personalEntry &&
                  (item.personalEntry.personalMeaning.trim().length > 0 ||
                    item.personalEntry.keywords.length > 0)
              );

              return (
                <Link
                  key={item.card.id}
                  href={`/grimorio/${item.card.slug}`}
                  className="group flex min-w-0 items-start gap-3.5 rounded-xl border border-border bg-ground p-4 transition-colors hover:border-control hover:bg-surface/60"
                >
                  <TarotCardPlate
                    card={item.card}
                    customImageUrl={item.personalEntry?.customImageUrl}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted num-tabular">
                          {item.card.arcana === "major"
                            ? `Arcano Mayor · ${item.card.romanNumeral ?? item.card.rankNumber}`
                            : `${item.card.suit ? SUIT_LABELS[item.card.suit as TarotSuit] : ""}`}
                        </p>
                        <h2 className="truncate font-serif text-lg text-ink group-hover:text-accent">
                          {item.card.canonicalName}
                        </h2>
                      </div>
                      {hasPersonal ? (
                        <Badge variant="positive" title="Con notas propias">
                          Con notas
                        </Badge>
                      ) : null}
                    </div>

                    <p className="line-clamp-2 text-xs text-muted leading-relaxed">
                      {item.personalEntry?.personalMeaning.trim()
                        ? item.personalEntry.personalMeaning
                        : `Significado base: ${item.card.traditionalUpright}`}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted num-tabular">
                      <span>{item.appearancesCount} apariciones</span>
                      {item.phenomenaCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-accent font-medium">
                          <Sparkles className="size-3" aria-hidden="true" />
                          {item.phenomenaCount}{" "}
                          {item.phenomenaCount === 1 ? "evento" : "eventos"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* =========================================================
          TAB 2: MIS MAZOS
         ========================================================= */}
      <TabsContent value="mazos" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-ink">
              Colección de mazos
            </h2>
            <p className="text-xs text-muted">
              Registra tus barajas para elegir uno o varios mazos al preparar cada lectura.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openCreateDeckDialog}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Registrar mazo</span>
          </Button>
        </div>

        {initialDecks.length === 0 ? (
          <div className="rounded-xl border border-border bg-ground p-8 text-center space-y-3">
            <BookMarked
              className="mx-auto size-6 text-muted"
              aria-hidden="true"
            />
            <p className="text-sm text-ink font-semibold">
              Registra tu primer mazo
            </p>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Guarda tus barajas para vincularlas a tus lecturas y registrar eventos físicos de cartas.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={openCreateDeckDialog}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>Registrar mazo</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {initialDecks.map((deck) => (
              <article
                key={deck.id}
                className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-serif text-xl text-ink break-words">
                        {deck.name}
                      </h3>
                      <p className="text-xs text-muted num-tabular">
                        {DECK_TRADITION_LABELS[deck.tradition]} · {deck.cardCount}{" "}
                        cartas
                        {deck.author ? ` · ${deck.author}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {deck.needsSetup ? (
                        <Badge variant="warning">Pendiente de completar</Badge>
                      ) : null}
                      {deck.isDefault ? (
                        <Badge variant="positive">Predeterminado</Badge>
                      ) : null}
                    </div>
                  </div>

                  {deck.needsSetup ? (
                    <p className="text-xs text-warning leading-relaxed">
                      Este mazo se creó rápidamente desde una lectura. Edítalo para completar su tradición, autoría y notas.
                    </p>
                  ) : null}

                  {deck.description ? (
                    <p className="text-sm text-muted leading-relaxed">
                      {deck.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                  <Link
                    href={`/lecturas?deckId=${encodeURIComponent(deck.id)}`}
                    className="font-medium text-ink hover:text-accent num-tabular"
                  >
                    {deck.readingsCount}{" "}
                    {deck.readingsCount === 1
                      ? "lectura registrada"
                      : "lecturas registradas"}{" "}
                    →
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={deck.needsSetup ? "primary" : "secondary"}
                      onClick={() => openEditDeckDialog(deck)}
                    >
                      <Edit3 className="size-3.5" aria-hidden="true" />
                      <span>
                        {deck.needsSetup ? "Completar datos" : "Editar"}
                      </span>
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Eliminar mazo ${deck.name}`}
                          className="rounded p-1.5 text-muted hover:bg-surface hover:text-negative"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Eliminar «{deck.name}» de tu colección?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Las lecturas anteriores que usaron este mazo se conservarán intactas en tu historial.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteDeck(deck.id)}
                          >
                            Eliminar mazo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </TabsContent>

      {/* =========================================================
          TAB 3: ESTRUCTURAS DE TIRADA
         ========================================================= */}
      <TabsContent value="tiradas" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-ink">
              Estructuras de tirada
            </h2>
            <p className="text-xs text-muted">
              Consulta las 4 tiradas clásicas incluidas o guarda tus propias estructuras reutilizables.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setSpreadDialogOpen(true)}
          >
            <Layers className="size-4" aria-hidden="true" />
            <span>Crear estructura propia</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {initialSpreads.map((spread) => (
            <article
              key={spread.id}
              className="min-w-0 rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif text-xl text-ink">
                      {spread.name}
                    </h3>
                    <Badge variant={spread.isBuiltin ? "neutral" : "positive"}>
                      {spread.isBuiltin ? spread.category : "Propia"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    {spread.description}
                  </p>
                </div>

                {!spread.isBuiltin ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Eliminar estructura ${spread.name}`}
                        className="rounded p-1.5 text-muted hover:bg-surface hover:text-negative"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ¿Eliminar estructura «{spread.name}»?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Las lecturas previas conservarán el nombre de la tirada y todas sus posiciones anotadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteSpread(spread.id)}
                        >
                          Eliminar estructura
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>

              <SpreadMap
                slots={buildSpreadSlots(spread.positions, [], new Set())}
              />
            </article>
          ))}
        </div>
      </TabsContent>

      {/* Dialog: Create or Edit Deck */}
      <Dialog
        open={deckDialogOpen}
        onOpenChange={(next) => {
          setDeckDialogOpen(next);
          if (!next) setEditingDeck(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDeck ? "Modificar y completar mazo" : "Registrar mazo"}
            </DialogTitle>
            <DialogDescription>
              {editingDeck
                ? "Completa o actualiza la tradición, cantidad de cartas y detalles de esta baraja."
                : "Añade una baraja a tu colección de mazos."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSaveDeck} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="deck-name">Nombre del mazo</Label>
              <Input
                id="deck-name"
                placeholder="Ej. Tarot de Marsella Camoin-Jodorowsky"
                {...deckForm.register("name")}
              />
              {deckForm.formState.errors.name ? (
                <p className="text-xs text-negative">
                  {deckForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="deck-tradition">Mazo / Tradición</Label>
                <select
                  id="deck-tradition"
                  className="flex h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink"
                  {...deckForm.register("tradition")}
                >
                  {(
                    Object.keys(
                      DECK_TRADITION_LABELS
                    ) as Array<keyof typeof DECK_TRADITION_LABELS>
                  ).map((key) => (
                    <option key={key} value={key}>
                      {DECK_TRADITION_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deck-count">Número de cartas</Label>
                <Input
                  id="deck-count"
                  type="number"
                  className="num-tabular"
                  {...deckForm.register("cardCount", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deck-author">Autoría o edición (opcional)</Label>
              <Input
                id="deck-author"
                placeholder="Ej. Pamela Colman Smith · Ed. Centennial"
                {...deckForm.register("author")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deck-description">
                Descripción o notas del mazo
              </Label>
              <Textarea
                id="deck-description"
                rows={3}
                placeholder="Edición, estilo visual, para qué sesiones prefieres usarlo…"
                {...deckForm.register("description")}
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
              <Checkbox
                checked={deckIsDefault}
                onCheckedChange={(v) =>
                  deckForm.setValue("isDefault", v === true)
                }
              />
              <span>Usar como mazo predeterminado al abrir nuevas lecturas</span>
            </label>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDeckDialogOpen(false);
                  setEditingDeck(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending
                  ? "Guardando…"
                  : editingDeck
                    ? "Guardar datos del mazo"
                    : "Guardar mazo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create Custom Spread Template */}
      <Dialog open={spreadDialogOpen} onOpenChange={setSpreadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear estructura de tirada propia</DialogTitle>
            <DialogDescription>
              Define las posiciones y arrastra las cartas sobre el mapa para ajustar su ubicación en la mesa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onCreateSpread} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="spread-name">Nombre de la tirada</Label>
                <Input
                  id="spread-name"
                  placeholder="Ej. Tirada de cuatro caminos"
                  {...spreadForm.register("name")}
                />
                {spreadForm.formState.errors.name ? (
                  <p className="text-xs text-negative">
                    {spreadForm.formState.errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="spread-category">Categoría</Label>
                <Input
                  id="spread-category"
                  placeholder="Ej. Vincular, Decisiones, General…"
                  {...spreadForm.register("category")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="spread-desc">Propósito de esta tirada</Label>
              <Textarea
                id="spread-desc"
                rows={2}
                placeholder="Cuándo usas esta estructura y qué responde…"
                {...spreadForm.register("description")}
              />
            </div>

            {/* Panel visualizador de la mesa primero */}
            <div className="space-y-2">
              <Label>Disposición de cartas en mesa</Label>
              <SpreadMap
                editable
                onMovePosition={(positionIndex, coordX, coordY) => {
                  const idx = positionIndex - 1;
                  if (idx >= 0 && idx < posFields.length) {
                    spreadForm.setValue(`positions.${idx}.coordX`, coordX, {
                      shouldDirty: true,
                    });
                    spreadForm.setValue(`positions.${idx}.coordY`, coordY, {
                      shouldDirty: true,
                    });
                  }
                }}
                slots={buildSpreadSlots(
                  (watchedPositions ?? []).map((p, idx) => ({
                    positionIndex: idx + 1,
                    title: p.title || `Carta ${idx + 1}`,
                    prompt: p.prompt || "",
                    coordX: Number.isFinite(p.coordX) ? p.coordX : 50,
                    coordY: Number.isFinite(p.coordY) ? p.coordY : 50,
                  })),
                  [],
                  new Set()
                )}
              />
              <p className="text-xs text-muted">
                Arrastra las cartas sobre el tapete para colocarlas donde quieras, o ajusta sus nombres y significados abajo.
              </p>
            </div>

            {/* Controles para gestionar las cartas directamente DEBAJO del visualizador */}
            <div className="space-y-2.5 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Posiciones de las cartas ({posFields.length})</Label>
                  <p className="text-xs text-muted">
                    Edita el nombre y significado de cada carta en la tirada.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const nextNum = posFields.length + 1;
                    appendPos({
                      positionIndex: nextNum,
                      title: `Carta ${nextNum}`,
                      prompt: "",
                      coordX: 50,
                      coordY: 50,
                    });
                  }}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  <span>Agregar carta</span>
                </Button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {posFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-lg border border-border bg-surface p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted num-tabular w-5">
                        {index + 1}.
                      </span>
                      <Input
                        placeholder="Nombre de posición"
                        {...spreadForm.register(`positions.${index}.title`)}
                      />
                      <Input
                        type="number"
                        min={5}
                        max={95}
                        aria-label={`Coordenada X posición ${index + 1}`}
                        className="w-20 num-tabular"
                        {...spreadForm.register(`positions.${index}.coordX`, {
                          valueAsNumber: true,
                        })}
                      />
                      <Input
                        type="number"
                        min={5}
                        max={95}
                        aria-label={`Coordenada Y posición ${index + 1}`}
                        className="w-20 num-tabular"
                        {...spreadForm.register(`positions.${index}.coordY`, {
                          valueAsNumber: true,
                        })}
                      />
                      {posFields.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removePos(index)}
                          aria-label={`Quitar posición ${index + 1}`}
                          className="rounded p-1.5 text-muted hover:text-negative"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    <Input
                      placeholder="Significado o función de esta posición (opcional)"
                      {...spreadForm.register(`positions.${index}.prompt`)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSpreadDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending ? "Guardando…" : "Guardar estructura"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
