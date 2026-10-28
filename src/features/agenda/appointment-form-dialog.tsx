"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  createAppointmentAction,
  updateAppointmentAction,
} from "@/actions/appointment-actions";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  APPOINTMENT_MODALITY_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/constants";
import { toIsoUtcString } from "@/lib/utils";
import {
  appointmentFormSchema,
  type AppointmentFormValues,
} from "@/schemas/domain";
import type {
  Appointment,
  AppointmentModality,
  AppointmentStatus,
  Consultant,
} from "@/types/domain";

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultants: Consultant[];
  appointment?: Appointment | null;
  defaultConsultantId?: string;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  consultants,
  appointment = null,
  defaultConsultantId = "",
}: AppointmentFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [isRegisteringNewConsultant, setIsRegisteringNewConsultant] =
    React.useState(consultants.length === 0 && !appointment);
  const [quickConsultantName, setQuickConsultantName] = React.useState("");

  const resolvedDefaultConsultant =
    appointment?.consultantId ||
    defaultConsultantId ||
    consultants[0]?.id ||
    "";

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      consultantId: resolvedDefaultConsultant,
      quickNewConsultant: "",
      title: appointment?.title ?? "",
      scheduledAt: appointment?.scheduledAt ?? new Date().toISOString(),
      hasSpecificDuration: appointment
        ? appointment.durationMinutes !== null
        : false,
      durationMinutes: appointment?.durationMinutes ?? 60,
      modality: appointment?.modality ?? "in_person",
      status: appointment?.status ?? "scheduled",
      intention: appointment?.intention ?? "",
      prepNotes: appointment?.prepNotes ?? "",
    },
  });

  const hasSpecificDuration = useWatch({
    control: form.control,
    name: "hasSpecificDuration",
  });

  const scheduledAt = useWatch({
    control: form.control,
    name: "scheduledAt",
  });

  const watchedConsultantId = useWatch({
    control: form.control,
    name: "consultantId",
  });

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setIsRegisteringNewConsultant(consultants.length === 0 && !appointment);
      setQuickConsultantName("");
    }
  }

  React.useEffect(() => {
    if (open) {
      const initialNew = consultants.length === 0 && !appointment;
      form.reset({
        consultantId:
          appointment?.consultantId ||
          defaultConsultantId ||
          consultants[0]?.id ||
          (initialNew ? "__new__" : ""),
        quickNewConsultant: "",
        title: appointment?.title ?? "",
        scheduledAt: appointment?.scheduledAt ?? new Date().toISOString(),
        hasSpecificDuration: appointment
          ? appointment.durationMinutes !== null
          : false,
        durationMinutes: appointment?.durationMinutes ?? 60,
        modality: appointment?.modality ?? "in_person",
        status: appointment?.status ?? "scheduled",
        intention: appointment?.intention ?? "",
        prepNotes: appointment?.prepNotes ?? "",
      });
    }
  }, [open, appointment, defaultConsultantId, consultants, form]);

  const onSubmit = form.handleSubmit((values) => {
    const inlineConsultant = quickConsultantName.trim();
    if (isRegisteringNewConsultant && inlineConsultant.length === 0) {
      toast.error("Por favor ingresa el nombre o alias del nuevo consultante.");
      return;
    }

    const normalized: AppointmentFormValues = {
      ...values,
      scheduledAt: toIsoUtcString(values.scheduledAt),
      quickNewConsultant: isRegisteringNewConsultant
        ? inlineConsultant
        : undefined,
      durationMinutes: values.hasSpecificDuration
        ? (values.durationMinutes ?? 60)
        : null,
    };

    startTransition(async () => {
      const res = appointment
        ? await updateAppointmentAction(appointment.id, normalized)
        : await createAppointmentAction(normalized);

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      if (isRegisteringNewConsultant) {
        toast.success(
          "Cita agendada y consultante creado. Verás un recordatorio en Inicio para completar sus datos."
        );
      } else {
        toast.success(
          res.message ?? (appointment ? "Cita actualizada." : "Cita agendada.")
        );
      }
      onOpenChange(false);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Editar sesión agendada" : "Programar sesión de lectura"}
          </DialogTitle>
          <DialogDescription>
            Vincula la sesión a un consultante y prepara el foco previo para abrir después la lectura en un clic.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="appt-consultant">Consultante</Label>
              {!isRegisteringNewConsultant ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisteringNewConsultant(true);
                    form.setValue("consultantId", "__new__", {
                      shouldValidate: true,
                    });
                  }}
                  className="text-xs text-accent hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <Plus className="size-3" aria-hidden="true" />
                  <span>Nuevo consultante</span>
                </button>
              ) : null}
            </div>

            {!isRegisteringNewConsultant ? (
              <select
                id="appt-consultant"
                className="flex h-11 sm:h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink transition-colors focus-visible:border-ink"
                value={watchedConsultantId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__new__") {
                    setIsRegisteringNewConsultant(true);
                    form.setValue("consultantId", "__new__", {
                      shouldValidate: true,
                    });
                  } else {
                    setIsRegisteringNewConsultant(false);
                    setQuickConsultantName("");
                    form.setValue("consultantId", val, {
                      shouldValidate: true,
                    });
                  }
                }}
              >
                <option value="" disabled>
                  Selecciona un consultante…
                </option>
                {consultants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                    {c.alias && c.alias !== c.fullName ? ` (${c.fullName})` : ""}
                  </option>
                ))}
                <option value="__new__">+ Registrar nuevo consultante…</option>
              </select>
            ) : (
              <div className="space-y-2 rounded-lg border border-accent/40 bg-accent/5 p-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor="appt-quick-new-consultant-name"
                    className="text-xs font-medium text-accent"
                  >
                    Nombre o alias del nuevo consultante
                  </Label>
                  {consultants.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisteringNewConsultant(false);
                        setQuickConsultantName("");
                        form.setValue(
                          "consultantId",
                          consultants[0]?.id ?? ""
                        );
                      }}
                      className="text-xs text-muted hover:text-ink inline-flex items-center gap-1"
                    >
                      <X className="size-3" aria-hidden="true" />
                      <span>Cancelar</span>
                    </button>
                  ) : null}
                </div>
                <Input
                  id="appt-quick-new-consultant-name"
                  aria-label="Nombre o alias del nuevo consultante"
                  value={quickConsultantName}
                  onChange={(e) => {
                    setQuickConsultantName(e.target.value);
                    form.setValue("quickNewConsultant", e.target.value, {
                      shouldValidate: true,
                    });
                  }}
                  placeholder="Escribe el nombre o alias (ej. Sofía Méndez o Viajera del Sur)…"
                  autoFocus
                />
                <p className="text-xs text-muted">
                  Se creará su ficha al agendar la sesión y verás un recordatorio en Inicio para completar sus datos luego.
                </p>
              </div>
            )}

            {form.formState.errors.consultantId ? (
              <p className="text-xs text-negative">
                {form.formState.errors.consultantId.message}
              </p>
            ) : null}
          </div>

            <div className="space-y-1.5">
              <Label htmlFor="appt-title">Motivo o título de la sesión</Label>
              <Input
                id="appt-title"
                placeholder="Ej. Lectura anual de cumpleaños, seguimiento laboral…"
                {...form.register("title")}
              />
              {form.formState.errors.title ? (
                <p className="text-xs text-negative">
                  {form.formState.errors.title.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="appt-datetime">Fecha y hora</Label>
                <DateTimePicker
                  id="appt-datetime"
                  value={scheduledAt}
                  onChange={(val) =>
                    form.setValue("scheduledAt", val, { shouldValidate: true })
                  }
                />
                {form.formState.errors.scheduledAt ? (
                  <p className="text-xs text-negative">
                    {form.formState.errors.scheduledAt.message}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
                <label
                  htmlFor="appt-has-duration"
                  className="flex items-center gap-2.5 text-sm text-ink cursor-pointer select-none"
                >
                  <Checkbox
                    id="appt-has-duration"
                    checked={Boolean(hasSpecificDuration)}
                    onCheckedChange={(checked) => {
                      const enabled = checked === true;
                      form.setValue("hasSpecificDuration", enabled, {
                        shouldValidate: true,
                      });
                      if (enabled && !form.getValues("durationMinutes")) {
                        form.setValue("durationMinutes", 60);
                      }
                    }}
                  />
                  <span>Duración específica</span>
                </label>

                {hasSpecificDuration ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="appt-duration">Duración (minutos)</Label>
                    <Input
                      id="appt-duration"
                      type="number"
                      step={15}
                      min={15}
                      max={240}
                      className="num-tabular"
                      {...form.register("durationMinutes", {
                        valueAsNumber: true,
                      })}
                    />
                    {form.formState.errors.durationMinutes ? (
                      <p className="text-xs text-negative">
                        {form.formState.errors.durationMinutes.message}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="appt-modality">Modalidad</Label>
                <select
                  id="appt-modality"
                  className="flex h-11 sm:h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink"
                  {...form.register("modality")}
                >
                  {(
                    Object.keys(
                      APPOINTMENT_MODALITY_LABELS
                    ) as AppointmentModality[]
                  ).map((m) => (
                    <option key={m} value={m}>
                      {APPOINTMENT_MODALITY_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="appt-status">Estado</Label>
                <select
                  id="appt-status"
                  className="flex h-11 sm:h-10 w-full rounded-lg border border-control bg-raised px-3 text-sm text-ink"
                  {...form.register("status")}
                >
                  {(
                    Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]
                  ).map((st) => (
                    <option key={st} value={st}>
                      {APPOINTMENT_STATUS_LABELS[st]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="appt-intention">
                Intención adelantada por el consultante{" "}
                <span className="text-muted font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="appt-intention"
                rows={2}
                placeholder="Tema principal que desea trabajar en la sesión…"
                {...form.register("intention")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="appt-prep">
                Notas de preparación{" "}
                <span className="text-muted font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="appt-prep"
                rows={2}
                placeholder="Mazo sugerido, lecturas previas para revisar antes de abrir la sesión…"
                {...form.register("prepNotes")}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending
                  ? "Guardando…"
                  : appointment
                    ? "Guardar cambios"
                    : "Agendar sesión"}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
