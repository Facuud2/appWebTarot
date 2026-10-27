"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  ArrowRight,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createReadingDraftAction } from "@/actions/reading-actions";
import { SpreadMap, buildSpreadSlots } from "@/components/shared/spread-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DECK_TRADITION_LABELS } from "@/lib/constants";
import { cn, toDatetimeLocalValue } from "@/lib/utils";
import {
  createReadingSchema,
  type CreateReadingValues,
} from "@/schemas/domain";
import type {
  Appointment,
  Consultant,
  Deck,
  SpreadPositionDefinition,
  SpreadTemplate,
} from "@/types/domain";

interface NewReadingFormProps {
  consultants: Consultant[];
  decks: Deck[];
  spreads: SpreadTemplate[];
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
    title: "Carta 1",
    prompt: "Situación actual o punto de partida",
    coordX: 25,
    coordY: 50,
  },
  {
    positionIndex: 2,
    title: "Carta 2",
    prompt: "Desarrollo o aspecto central",
    coordX: 50,
    coordY: 50,
  },
  {
    positionIndex: 3,
    title: "Carta 3",
    prompt: "Consejo o dirección",
    coordX: 75,
    coordY: 50,
  },
];

export function NewReadingForm({
  consultants,
  decks,
  spreads,
  defaultDeckId,
  defaultSpreadId,
  initialConsultantId = "",
  initialAppointment = null,
  initialIntention = "",
  initialNowIso,
}: NewReadingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [activeCustomIndex, setActiveCustomIndex] = React.useState<number | null>(null);
  const [registerNewDeckChecked, setRegisterNewDeckChecked] =
    React.useState(false);
  const [pendingDeckName, setPendingDeckName] = React.useState("");
  const [isRegisteringNewConsultant, setIsRegisteringNewConsultant] =
    React.useState(false);
  const [quickConsultantName, setQuickConsultantName] = React.useState("");

  const resolvedInitialConsultant =
    initialAppointment?.consultantId || initialConsultantId;
  const resolvedInitialIntention =
    initialIntention ||
    initialAppointment?.intention ||
    initialAppointment?.title ||
    "";
  const resolvedInitialTitle = initialAppointment?.title || "";

  const initialClassicSpread =
    spreads.find((s) => s.id === defaultSpreadId) ?? spreads[0] ?? null;

  const form = useForm<CreateReadingValues>({
    resolver: zodResolver(createReadingSchema),
    defaultValues: {
      title: resolvedInitialTitle,
      consultantId: resolvedInitialConsultant,
      appointmentId: initialAppointment?.id ?? "",
      deckIds: defaultDeckId ? [defaultDeckId] : [],
      quickNewDecks: [],
      quickNewConsultant: "",
      spreadMode: initialClassicSpread ? "classic" : "custom",
      spreadTemplateId: initialClassicSpread?.id ?? "",
      spreadName: initialClassicSpread?.name ?? "Estructura personalizada",
      customPositions: DEFAULT_CUSTOM_POSITIONS,
      questionIntention: resolvedInitialIntention,
      sessionContext: initialAppointment?.prepNotes ?? "",
      performedAt: toDatetimeLocalValue(
        initialNowIso ?? "2026-10-25T12:00:00.000Z"
      ),
    },
  });

  const watchedConsultantId = useWatch({
    control: form.control,
    name: "consultantId",
  });
  const watchedDeckIds = useWatch({
    control: form.control,
    name: "deckIds",
  });
  const watchedQuickNewDecks = useWatch({
    control: form.control,
    name: "quickNewDecks",
  });
  const watchedSpreadMode = useWatch({
    control: form.control,
    name: "spreadMode",
  });
  const watchedSpreadId = useWatch({
    control: form.control,
    name: "spreadTemplateId",
  });
  const watchedCustomPositions = useWatch({
    control: form.control,
    name: "customPositions",
  });
  const watchedPerformedAt = useWatch({
    control: form.control,
    name: "performedAt",
  });

  const selectedSpread = React.useMemo(
    () =>
      watchedSpreadMode === "classic"
        ? (spreads.find((s) => s.id === watchedSpreadId) ?? null)
        : null,
    [spreads, watchedSpreadMode, watchedSpreadId]
  );

  const previewSlots = React.useMemo(() => {
    if (watchedSpreadMode === "custom") {
      return buildSpreadSlots(
        watchedCustomPositions,
        watchedCustomPositions.map((pos) => ({
          positionIndex: pos.positionIndex,
          positionTitle: pos.title,
          card: null,
          orientation: "upright" as const,
          coordX: pos.coordX,
          coordY: pos.coordY,
        })),
        new Set()
      );
    }
    return buildSpreadSlots(selectedSpread?.positions, [], new Set());
  }, [watchedSpreadMode, watchedCustomPositions, selectedSpread]);

  const toggleDeckSelection = (deckId: string, checked: boolean) => {
    const current = form.getValues("deckIds");
    const next = checked
      ? Array.from(new Set([...current, deckId]))
      : current.filter((id) => id !== deckId);
    form.setValue("deckIds", next, { shouldDirty: true });
  };

  const addQuickDeckName = () => {
    const clean = pendingDeckName.trim();
    if (!clean) return;
    const current = form.getValues("quickNewDecks");
    if (
      current.some((d) => d.toLowerCase() === clean.toLowerCase()) ||
      decks.some((d) => d.name.toLowerCase() === clean.toLowerCase())
    ) {
      toast.error("Ese nombre de mazo ya está en la lista.");
      return;
    }
    if (current.length >= 5) {
      toast.error("Puedes registrar hasta 5 mazos nuevos por lectura.");
      return;
    }
    form.setValue("quickNewDecks", [...current, clean], { shouldDirty: true });
    setPendingDeckName("");
  };

  const removeQuickDeckName = (nameToRemove: string) => {
    const current = form.getValues("quickNewDecks");
    form.setValue(
      "quickNewDecks",
      current.filter((n) => n !== nameToRemove),
      { shouldDirty: true }
    );
  };

  const handleStructureChange = (val: string) => {
    if (val === "custom") {
      form.setValue("spreadMode", "custom", { shouldDirty: true });
      form.setValue("spreadTemplateId", "", { shouldDirty: true });
      form.setValue("spreadName", "Estructura personalizada", {
        shouldDirty: true,
      });
      if (form.getValues("customPositions").length === 0) {
        form.setValue("customPositions", DEFAULT_CUSTOM_POSITIONS, {
          shouldDirty: true,
        });
      }
    } else {
      form.setValue("spreadMode", "classic", { shouldDirty: true });
      form.setValue("spreadTemplateId", val, { shouldDirty: true });
      const found = spreads.find((s) => s.id === val);
      if (found) {
        form.setValue("spreadName", found.name, { shouldDirty: true });
      }
    }
  };

  const handleMoveCustomPosition = (
    positionIndex: number,
    coordX: number,
    coordY: number
  ) => {
    const current = form.getValues("customPositions");
    const updated = current.map((p) =>
      p.positionIndex === positionIndex ? { ...p, coordX, coordY } : p
    );
    form.setValue("customPositions", updated, { shouldDirty: true });
  };

  const addCustomPosition = () => {
    const current = form.getValues("customPositions");
    if (current.length >= 10) {
      toast.error("El tapete admite un máximo de 10 cartas.");
      return;
    }
    const nextIdx = current.length + 1;
    const newPositions = [
      ...current,
      {
        positionIndex: nextIdx,
        title: `Carta ${nextIdx}`,
        prompt: "Significado o propósito de esta posición",
        coordX: 50,
        coordY: 50,
      },
    ];
    const redistributed = newPositions.map((pos, idx) => ({
      ...pos,
      positionIndex: idx + 1,
      coordX: Math.round(15 + (idx / Math.max(1, newPositions.length - 1)) * 70),
    }));
    form.setValue("customPositions", redistributed, { shouldDirty: true });
    setActiveCustomIndex(nextIdx);
  };

  const removeCustomPosition = (indexToRemove: number) => {
    const current = form.getValues("customPositions");
    if (current.length <= 1) {
      toast.error("La estructura debe tener al menos una posición.");
      return;
    }
    const filtered = current.filter((p) => p.positionIndex !== indexToRemove);
    const reindexed = filtered.map((pos, idx) => ({
      ...pos,
      positionIndex: idx + 1,
      coordX:
        filtered.length === 1
          ? 50
          : Math.round(15 + (idx / (filtered.length - 1)) * 70),
    }));
    form.setValue("customPositions", reindexed, { shouldDirty: true });
    if (activeCustomIndex === indexToRemove) {
      setActiveCustomIndex(null);
    }
  };

  const updateCustomPositionTitle = (positionIndex: number, title: string) => {
    const current = form.getValues("customPositions");
    const updated = current.map((p) =>
      p.positionIndex === positionIndex ? { ...p, title } : p
    );
    form.setValue("customPositions", updated, { shouldDirty: true });
  };

  const updateCustomPositionPrompt = (positionIndex: number, prompt: string) => {
    const current = form.getValues("customPositions");
    const updated = current.map((p) =>
      p.positionIndex === positionIndex ? { ...p, prompt } : p
    );
    form.setValue("customPositions", updated, { shouldDirty: true });
  };

  const resetCustomPositions = () => {
    form.setValue("customPositions", DEFAULT_CUSTOM_POSITIONS, {
      shouldDirty: true,
    });
    setActiveCustomIndex(null);
  };

  const onSubmit = form.handleSubmit((values) => {
    const inlineConsultant = quickConsultantName.trim();
    if (isRegisteringNewConsultant && inlineConsultant.length === 0) {
      toast.error("Por favor ingresa el nombre o alias del nuevo consultante.");
      return;
    }

    const mergedQuickDecks = [...values.quickNewDecks];
    const inlineDraftName = pendingDeckName.trim();
    if (registerNewDeckChecked && inlineDraftName.length > 0) {
      const alreadyQueued = mergedQuickDecks.some(
        (d) => d.toLowerCase() === inlineDraftName.toLowerCase()
      );
      if (!alreadyQueued) {
        mergedQuickDecks.push(inlineDraftName);
      }
    }

    startTransition(async () => {
      const res = await createReadingDraftAction({
        ...values,
        quickNewConsultant: isRegisteringNewConsultant ? inlineConsultant : undefined,
        quickNewDecks: mergedQuickDecks,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (isRegisteringNewConsultant && mergedQuickDecks.length > 0) {
        toast.success(
          "Mesa abierta, consultante y mazo guardados. Verás recordatorios en Inicio para completar sus datos."
        );
      } else if (isRegisteringNewConsultant) {
        toast.success(
          "Mesa de lectura abierta y consultante creado. Verás un recordatorio en Inicio para completar su información."
        );
      } else if (mergedQuickDecks.length > 0) {
        toast.success(
          "Mesa abierta y mazo guardado. Verás un recordatorio en Inicio para completar sus datos."
        );
      } else {
        toast.success(res.message ?? "Mesa de lectura abierta.");
      }
      router.push(`/lecturas/${res.data.id}`);
      router.refresh();
    });
  });

  const selectStructureValue =
    watchedSpreadMode === "custom" ? "custom" : watchedSpreadId;

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start"
    >
      <div className="min-w-0 lg:col-span-7 space-y-6 rounded-xl border border-border bg-surface p-4 sm:p-6">
        {initialAppointment ? (
          <div className="rounded-lg border border-border bg-ground p-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="break-words text-xs font-medium text-ink">
                Vinculada a cita: {initialAppointment.title}
              </p>
              <p className="text-xs text-muted">
                Al completar la lectura, el estado de la cita pasará automáticamente a Realizada.
              </p>
            </div>
            <Badge variant="positive">Cita conectada</Badge>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="reading-consultant">Consultante</Label>
              {!isRegisteringNewConsultant ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisteringNewConsultant(true);
                    form.setValue("consultantId", "__new__", { shouldValidate: true });
                  }}
                  className="text-xs text-accent hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="size-3" aria-hidden="true" />
                  <span>Nuevo consultante</span>
                </button>
              ) : null}
            </div>
            <select
              id="reading-consultant"
              className="flex h-11 sm:h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink transition-colors focus-visible:border-ink"
              value={isRegisteringNewConsultant ? "__new__" : (watchedConsultantId || "")}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__new__") {
                  setIsRegisteringNewConsultant(true);
                  form.setValue("consultantId", "__new__", { shouldValidate: true });
                } else {
                  setIsRegisteringNewConsultant(false);
                  setQuickConsultantName("");
                  form.setValue("consultantId", val, { shouldValidate: true });
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
              <option value="__new__">+ Registrar nuevo consultante…</option>
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
                      form.setValue("consultantId", "");
                    }}
                    className="text-xs text-muted hover:text-ink inline-flex items-center gap-1"
                  >
                    <X className="size-3" aria-hidden="true" />
                    <span>Cancelar</span>
                  </button>
                </div>
                <Input
                  id="quick-new-consultant-name"
                  aria-label="Nombre o alias del nuevo consultante"
                  value={quickConsultantName}
                  onChange={(e) => setQuickConsultantName(e.target.value)}
                  placeholder="Escribe el nombre o alias (ej. Sofía Méndez o Viajera del Sur)…"
                  autoFocus
                />
                <p className="text-xs text-muted">
                  Se creará su ficha al iniciar la lectura y verás un recordatorio en Inicio para completar sus datos luego.
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reading-performed-at">Fecha y hora</Label>
            <DateTimePicker
              id="reading-performed-at"
              value={watchedPerformedAt}
              onChange={(val) =>
                form.setValue("performedAt", val, { shouldValidate: true })
              }
            />
            {form.formState.errors.performedAt ? (
              <p className="text-xs text-negative">
                {form.formState.errors.performedAt.message}
              </p>
            ) : null}
          </div>
        </div>

        {/* Multi-deck selector + last option "Registrar mazo" */}
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label>Mazos a utilizar</Label>
            <span className="text-xs text-muted">
              Puedes elegir uno o varios mazos
            </span>
          </div>

          <div className="divide-y divide-rule rounded-xl border border-border bg-ground">
            {decks.map((d) => {
              const checked = watchedDeckIds.includes(d.id);
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
                        {DECK_TRADITION_LABELS[d.tradition]}
                      </p>
                    </div>
                  </div>
                  {d.needsSetup ? (
                    <Badge variant="warning">Faltan datos</Badge>
                  ) : null}
                </label>
              );
            })}

            {/* Last option: Registrar mazo */}
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
                  Registrar mazo
                </span>
              </label>

              {registerNewDeckChecked ? (
                <div className="space-y-2 pl-6">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="quick-new-deck-name"
                      aria-label="Nombre del nuevo mazo"
                      value={pendingDeckName}
                      onChange={(e) => setPendingDeckName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addQuickDeckName();
                        }
                      }}
                      placeholder="Escribe el nombre del mazo (ej. Tarot Egipcio Kier)…"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addQuickDeckName}
                      className="shrink-0"
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                      <span>Añadir mazo</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted">
                    Se guardará al abrir la mesa en vivo y verás un recordatorio en Inicio para completar su información.
                  </p>
                </div>
              ) : null}

              {watchedQuickNewDecks.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {watchedQuickNewDecks.map((deckName) => (
                    <span
                      key={deckName}
                      className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-surface px-2.5 py-1 text-xs font-medium text-ink"
                    >
                      <span>Nuevo: {deckName}</span>
                      <button
                        type="button"
                        onClick={() => removeQuickDeckName(deckName)}
                        aria-label={`Quitar mazo nuevo ${deckName}`}
                        className="text-muted hover:text-negative"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Spread Structure Selector: 4 Classic + 5th "Personalizada" */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reading-spread-select">
              Estructura de cartas en la mesa
            </Label>
            <select
              id="reading-spread-select"
              value={selectStructureValue}
              onChange={(e) => handleStructureChange(e.target.value)}
              className="flex h-11 sm:h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink transition-colors focus-visible:border-ink"
            >
              {spreads.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
              <option value="custom">Personalizada</option>
            </select>
          </div>

          {watchedSpreadMode === "custom" ? (
            <div className="space-y-1.5">
              <Label htmlFor="reading-custom-spread-name">
                Nombre de la estructura{" "}
                <span className="text-muted font-normal">(opcional)</span>
              </Label>
              <Input
                id="reading-custom-spread-name"
                placeholder="Ej. Tirada de pareja, Espejo de 4 cartas…"
                {...form.register("spreadName")}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reading-intention">
            Pregunta o tema de la consulta
          </Label>
          <Textarea
            id="reading-intention"
            rows={3}
            placeholder="¿Qué desea consultar la persona o qué quieres revisar en esta lectura?"
            {...form.register("questionIntention")}
          />
          {form.formState.errors.questionIntention ? (
            <p className="text-xs text-negative">
              {form.formState.errors.questionIntention.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reading-context">
            Notas previas{" "}
            <span className="text-muted font-normal">(opcional)</span>
          </Label>
          <Textarea
            id="reading-context"
            rows={2}
            placeholder="Contexto inicial o acuerdos previos de la sesión…"
            {...form.register("sessionContext")}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            <span>{isPending ? "Abriendo mesa…" : "Abrir mesa en vivo"}</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Right column: Interactive Spatial Map & Position Meanings */}
      <aside className="min-w-0 lg:col-span-5 space-y-5 lg:sticky lg:top-6">
        <div className="min-w-0 rounded-xl border border-border bg-ground p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-ink">
                {watchedSpreadMode === "custom"
                  ? "Estructura personalizada"
                  : (selectedSpread?.name ?? "Estructura de cartas")}
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                {watchedSpreadMode === "custom"
                  ? "Arrastra las cartas directamente en el tapete o pulsa «Mover cartas» en móvil para acomodarlas a tu gusto."
                  : selectedSpread?.description}
              </p>
            </div>
            <Layers
              className="size-4 text-muted shrink-0 mt-0.5"
              aria-hidden="true"
            />
          </div>

          <SpreadMap
            slots={previewSlots}
            activePositionIndex={activeCustomIndex}
            onSelectPosition={(idx) => setActiveCustomIndex(idx)}
            editable={watchedSpreadMode === "custom"}
            onMovePosition={
              watchedSpreadMode === "custom"
                ? handleMoveCustomPosition
                : undefined
            }
          />

          {watchedSpreadMode === "custom" ? (
            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-ink">
                  Posiciones en la mesa ({watchedCustomPositions.length})
                </h3>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={addCustomPosition}
                    className="h-7 px-2 text-xs"
                    disabled={watchedCustomPositions.length >= 10}
                  >
                    <Plus className="size-3 mr-1" aria-hidden="true" />
                    <span>Añadir carta</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      removeCustomPosition(watchedCustomPositions.length)
                    }
                    className="h-7 px-2 text-xs text-muted hover:text-ink"
                    disabled={watchedCustomPositions.length <= 1}
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
                    <span className="sr-only">Restablecer</span>
                  </Button>
                </div>
              </div>

              {/* Lista editable de posiciones */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {watchedCustomPositions.map((pos) => {
                  const isSelected = activeCustomIndex === pos.positionIndex;
                  return (
                    <div
                      key={pos.positionIndex}
                      onClick={() => setActiveCustomIndex(pos.positionIndex)}
                      className={cn(
                        "rounded-lg border p-2.5 transition-colors cursor-pointer space-y-2 text-xs",
                        isSelected
                          ? "border-accent bg-accent/5 ring-1 ring-accent/30"
                          : "border-border bg-surface hover:border-border-hover"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="inline-flex size-5 items-center justify-center rounded-full bg-ground border border-border text-[11px] font-medium text-ink shrink-0 num-tabular">
                            {pos.positionIndex}
                          </span>
                          <input
                            type="text"
                            value={pos.title}
                            onChange={(e) =>
                              updateCustomPositionTitle(
                                pos.positionIndex,
                                e.target.value
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            placeholder={`Carta ${pos.positionIndex}`}
                            className="flex-1 bg-transparent font-medium text-ink focus:outline-none focus:underline"
                          />
                        </div>
                        <span className="text-[10px] text-muted num-tabular shrink-0">
                          X:{Math.round(pos.coordX)}% Y:{Math.round(pos.coordY)}%
                        </span>
                      </div>
                      <input
                        type="text"
                        value={pos.prompt}
                        onChange={(e) =>
                          updateCustomPositionPrompt(
                            pos.positionIndex,
                            e.target.value
                          )
                        }
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Significado o enfoque de esta carta (opcional)"
                        className="w-full text-xs text-muted placeholder:text-muted/60 bg-transparent focus:outline-none focus:text-ink"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {watchedSpreadMode === "classic" &&
          selectedSpread &&
          selectedSpread.positions.length > 0 ? (
            <div className="border-t border-border pt-3 space-y-2">
              <h3 className="text-xs font-semibold text-ink">
                Posiciones de la tirada ({selectedSpread.positions.length})
              </h3>
              <ol className="space-y-1.5 text-xs text-muted max-h-56 overflow-y-auto pr-1">
                {selectedSpread.positions.map((pos) => (
                  <li
                    key={pos.positionIndex}
                    className="flex items-baseline gap-2"
                  >
                    <span className="font-medium text-ink num-tabular">
                      {pos.positionIndex}.
                    </span>
                    <span>
                      <strong className="font-medium text-ink">
                        {pos.title}:
                      </strong>{" "}
                      {pos.prompt}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="rounded-lg border border-border/70 bg-surface/70 p-3 text-xs text-muted flex items-start gap-2.5">
            <Sparkles
              className="size-4 text-accent shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="leading-relaxed">
              <strong>Paso preparatorio:</strong> Al pulsar &ldquo;Abrir mesa en vivo&rdquo; pasarás a la mesa interactiva para asignar las cartas, tirar los mazos y modificar la estructura.
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
