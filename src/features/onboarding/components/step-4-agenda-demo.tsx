"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  Check,
  Clock,
  HelpCircle,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { cn } from "@/lib/utils";
import type { Consultant } from "@/types/domain";

export const AGENDA_DEMO_STAGES = [
  { id: 1, label: "Agendar", shortLabel: "Agendar" },
  { id: 2, label: "Fecha y hora", shortLabel: "Fecha" },
  { id: 3, label: "Consultante", shortLabel: "Consultante" },
  { id: 4, label: "Intención", shortLabel: "Intención" },
  { id: 5, label: "Confirmación", shortLabel: "Confirmar" },
];

interface Step4AgendaDemoProps {
  consultants: Consultant[];
  createdAppointmentId: string | null;
  hasSkipped: boolean;
  demoStep: number;
  subDirection?: "forward" | "backward";
  onDemoStepChange: (step: number, direction: "forward" | "backward") => void;
  onAppointmentCreated: (appointmentId: string) => void;
  onSkip: () => void;
  onContinue: () => void;
  onPrevStep: () => void;
}

export function Step4AgendaDemo({
  consultants,
  createdAppointmentId,
  hasSkipped: _hasSkipped,
  demoStep,
  subDirection = "forward",
  onDemoStepChange,
  onAppointmentCreated,
  onSkip,
  onContinue,
  onPrevStep,
}: Step4AgendaDemoProps) {
  // Formulario para crear cita real opcional (en etapa 5)
  const [showRealForm, setShowRealForm] = React.useState<boolean>(false);
  const [isSubmittingReal, setIsSubmittingReal] = React.useState<boolean>(false);

  const [realConsultantName, setRealConsultantName] = React.useState<string>("");
  const [realSelectedConsultantId, setRealSelectedConsultantId] = React.useState<string>(
    consultants[0]?.id || "new"
  );
  const [realTitle, setRealTitle] = React.useState<string>("");
  const [realDate, setRealDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d.toISOString();
  });
  const [realModality, setRealModality] = React.useState<
    "in_person" | "video" | "audio" | "written"
  >("video");
  const [realIntention, setRealIntention] = React.useState<string>("");

  const handleNextSubStep = () => {
    if (demoStep < 5) {
      onDemoStepChange(demoStep + 1, "forward");
    } else {
      onContinue();
    }
  };

  const handlePrevSubStep = () => {
    if (demoStep > 1) {
      onDemoStepChange(demoStep - 1, "backward");
    } else {
      onPrevStep();
    }
  };

  const handleCreateRealAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReal(true);

    try {
      let targetConsultantId = realSelectedConsultantId;

      if (targetConsultantId === "new") {
        const cleanName = realConsultantName.trim();
        if (!cleanName) {
          toast.error("Por favor, ingresa el nombre de la persona que consulta.");
          setIsSubmittingReal(false);
          return;
        }

        const { createConsultantAction } = await import(
          "@/actions/consultant-actions"
        );
        const consRes = await createConsultantAction({
          fullName: cleanName,
          alias: cleanName.split(" ")[0] || cleanName,
          email: "",
          phone: "",
          preferredChannel: "Presencial / Videollamada",
          contextNotes: "Consultante registrado desde el onboarding inicial",
          personalNotes: "",
          tags: [],
        });

        if (!consRes.ok) {
          toast.error(consRes.error || "No se pudo registrar al consultante.");
          setIsSubmittingReal(false);
          return;
        }

        targetConsultantId = consRes.data.id;
      }

      const { createAppointmentAction } = await import(
        "@/actions/appointment-actions"
      );
      const apptRes = await createAppointmentAction({
        consultantId: targetConsultantId,
        title: realTitle.trim() || "Consulta de Tarot",
        scheduledAt: new Date(realDate).toISOString(),
        hasSpecificDuration: true,
        durationMinutes: 60,
        modality: realModality,
        status: "scheduled",
        intention: realIntention.trim(),
        prepNotes: "",
      });

      if (!apptRes.ok) {
        toast.error(apptRes.error || "No se pudo registrar la cita.");
        setIsSubmittingReal(false);
        return;
      }

      toast.success("¡Tu primera cita real fue agendada correctamente!");
      onAppointmentCreated(apptRes.data.id);
      setShowRealForm(false);
    } catch {
      toast.error("Ocurrió un error al guardar la cita.");
    } finally {
      setIsSubmittingReal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-tight">
          Organiza tus citas y ten a mano la información de cada consulta
        </h2>
        <p className="text-sm text-muted">
          Aprende cómo programar sesiones con antelación o registrar consultas en vivo
          en el momento exacto en que ocurren.
        </p>
      </div>

      {/* Contenedor principal con transición estilo iOS entre subetapas */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div
          key={demoStep}
          className={cn(
            "p-5 sm:p-6 space-y-6",
            subDirection === "forward" ? "t-slide-forward" : "t-slide-backward"
          )}
        >
          {/* Subetapa 1: Agendar */}
          {demoStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-accent font-medium text-xs">
                  <CalendarPlus className="size-4" />
                  <span>Acceso rápido desde el panel</span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl text-ink font-medium">
                  Hacer clic en «Agendar cita»
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  En cualquier momento desde la barra superior de la mesa o desde la sección Agenda,
                  abres el diálogo de turnos con un solo clic.
                </p>
              </div>

              {/* Ejemplo ilustrativo */}
              <div className="rounded-lg border border-border bg-ground p-4 space-y-3">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                  Ejemplo en la mesa de trabajo
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-ink flex items-center gap-2 shadow-2xs font-medium">
                    <CalendarPlus className="size-4 text-accent" />
                    <span>Agendar cita</span>
                  </div>
                  <span className="text-xs text-muted">
                    Atajo disponible permanentemente en cabecera
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Subetapa 2: Fecha y formato */}
          {demoStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-accent font-medium text-xs">
                  <Clock className="size-4" />
                  <span>Definición temporal y formato</span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl text-ink font-medium">
                  Seleccionar fecha, horario y formato
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Indica si el encuentro será presencial en tu mesa de estudio, por videollamada,
                  audio o informe escrito, y define la duración estimada.
                </p>
              </div>

              {/* Ejemplo ilustrativo */}
              <div className="rounded-lg border border-border bg-ground p-4 space-y-3">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                  Ejemplo de configuración de turno
                </span>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-surface px-3 py-1.5 border border-border text-ink font-medium flex items-center gap-1.5 shadow-2xs">
                    <Clock className="size-3.5 text-muted" />
                    Viernes 17:00 hs (60 minutos)
                  </span>
                  <span className="rounded-md bg-accent/10 px-3 py-1.5 text-accent border border-accent/20 font-medium">
                    Modalidad: Videollamada
                  </span>
                  <span className="rounded-md bg-surface px-3 py-1.5 border border-border/60 text-muted text-xs">
                    Zona horaria sincronizada
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Subetapa 3: Consultante */}
          {demoStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-accent font-medium text-xs">
                  <UserCheck className="size-4" />
                  <span>Ficha del consultante</span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl text-ink font-medium">
                  Elegir o crear el consultante
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Puedes buscar a una persona de tu lista previa o escribir su nombre para registrarla
                  directamente sin salir del formulario.
                </p>
              </div>

              {/* Ejemplo ilustrativo */}
              <div className="rounded-lg border border-border bg-ground p-4 space-y-3">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                  Ejemplo de ficha vinculada
                </span>
                <div className="rounded-lg border border-border bg-surface p-3 text-xs text-ink max-w-md flex items-center justify-between shadow-2xs">
                  <div className="space-y-0.5">
                    <span className="font-medium text-ink block">Mariana Echeverría</span>
                    <span className="text-[11px] text-muted">Historial: 3 lecturas previas</span>
                  </div>
                  <Badge variant="neutral" className="text-[10px]">
                    Presencial
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Subetapa 4: Intención */}
          {demoStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-accent font-medium text-xs">
                  <Sparkles className="size-4" />
                  <span>Foco de la lectura</span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl text-ink font-medium">
                  Anotar la intención o inquietud inicial
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Registra qué desea explorar el consultante: una decisión profesional, un cierre
                  de ciclo o una pregunta abierta para tenerla visible antes de la sesión.
                </p>
              </div>

              {/* Ejemplo ilustrativo */}
              <div className="rounded-lg border border-border bg-ground p-4 space-y-3">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                  Ejemplo de nota previa al encuentro
                </span>
                <div className="rounded-lg border border-border/80 bg-surface p-3 text-xs text-ink/90 italic font-serif leading-relaxed shadow-2xs">
                  «¿Qué criterio conviene priorizar al encarar los primeros proyectos en solitario?»
                </div>
              </div>
            </div>
          )}

          {/* Subetapa 5: Confirmación y Cita real */}
          {demoStep === 5 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-positive font-medium text-xs">
                  <CalendarCheck className="size-4" />
                  <span>Cita confirmada en tu agenda</span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl text-ink font-medium">
                  Guardada y lista para iniciar la lectura
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  La cita queda agendada. Cuando llegue el momento de la consulta, podrás hacer clic
                  en «Iniciar lectura» para abrir la mesa de tirada con los datos ya vinculados.
                </p>
                <div className="flex items-center gap-2 text-xs text-positive font-medium pt-1">
                  <Check className="size-4 stroke-[2.5]" />
                  <span>Cita visible en la cronología de hoy y próximas fechas</span>
                </div>
              </div>

              {/* Registro opcional de cita real */}
              <div className="rounded-lg border border-border bg-ground p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-semibold text-ink">
                      ¿Deseas agendar tu primera cita real ahora?
                    </h4>
                    <p className="text-[11px] text-muted">
                      Opcional. Si ya tienes una sesión programada, puedes guardarla ahora.
                    </p>
                  </div>

                  {!showRealForm && !createdAppointmentId && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowRealForm(true)}
                      className="shrink-0 text-xs gap-1.5"
                    >
                      <CalendarPlus className="size-3.5" />
                      <span>Agendar mi primera cita</span>
                    </Button>
                  )}

                  {createdAppointmentId && (
                    <Badge variant="positive" className="self-start sm:self-auto gap-1">
                      <Check className="size-3" />
                      <span>Cita real registrada</span>
                    </Badge>
                  )}
                </div>

                {showRealForm && (
                  <form
                    onSubmit={handleCreateRealAppointment}
                    className="space-y-3 pt-3 border-t border-border t-slide-forward"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="real-appt-consultant" requiredIndicator className="text-xs">
                          Consultante
                        </Label>
                        {consultants.length > 0 ? (
                          <select
                            id="real-appt-consultant"
                            value={realSelectedConsultantId}
                            onChange={(e) => setRealSelectedConsultantId(e.target.value)}
                            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-ink outline-none focus:border-accent"
                          >
                            {consultants.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.fullName}
                              </option>
                            ))}
                            <option value="new">+ Registrar nuevo consultante…</option>
                          </select>
                        ) : (
                          <Input
                            id="real-appt-name"
                            placeholder="Nombre de la persona que consulta..."
                            value={realConsultantName}
                            onChange={(e) => setRealConsultantName(e.target.value)}
                            className="h-9 text-xs"
                            required
                          />
                        )}
                        {realSelectedConsultantId === "new" && consultants.length > 0 && (
                          <Input
                            placeholder="Nombre del nuevo consultante..."
                            value={realConsultantName}
                            onChange={(e) => setRealConsultantName(e.target.value)}
                            className="mt-2 h-9 text-xs"
                            required
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="real-appt-title" className="text-xs">
                          Título de la consulta
                        </Label>
                        <Input
                          id="real-appt-title"
                          value={realTitle}
                          onChange={(e) => setRealTitle(e.target.value)}
                          className="h-9 text-xs"
                          placeholder="Ej. Lectura de inicio de ciclo"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="real-appt-date" className="text-xs">
                          Fecha y hora
                        </Label>
                        <DateTimePicker
                          id="real-appt-date"
                          value={realDate}
                          onChange={setRealDate}
                          aria-label="Fecha y hora de la cita"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="real-appt-modality" className="text-xs">
                          Modalidad
                        </Label>
                        <select
                          id="real-appt-modality"
                          value={realModality}
                          onChange={(e) =>
                            setRealModality(
                              e.target.value as "in_person" | "video" | "audio" | "written"
                            )
                          }
                          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-xs text-ink outline-none focus:border-accent"
                        >
                          <option value="in_person">Presencial</option>
                          <option value="video">Videollamada</option>
                          <option value="audio">Llamada de audio</option>
                          <option value="written">Informe escrito</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="real-appt-intention" className="text-xs">
                        Intención o consulta inicial (opcional)
                      </Label>
                      <Textarea
                        id="real-appt-intention"
                        placeholder="Notas de contexto o preguntas que el consultante anticipó..."
                        value={realIntention}
                        onChange={(e) => setRealIntention(e.target.value)}
                        rows={2}
                        className="text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRealForm(false)}
                        disabled={isSubmittingReal}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isSubmittingReal}
                        className="text-xs"
                      >
                        {isSubmittingReal ? "Guardando cita…" : "Guardar cita real"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Nota de lecturas espontáneas */}
          <div className="rounded-lg border border-border/70 bg-ground/60 p-3.5 text-xs text-muted flex items-start gap-2.5">
            <HelpCircle className="size-4 text-accent shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <strong className="text-ink font-medium">
                ¿Y si realizas una lectura espontánea en el momento?
              </strong>
              <p>
                No necesitas programar una cita previa. Puedes hacer clic en «Nueva lectura» directamente
                para abrir la mesa de cartas y registrar una sesión en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN SECUENCIAL UNIFICADA ENTRE SUBETAPAS */}
        <div className="flex items-center justify-between border-t border-border bg-ground px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePrevSubStep}
              className="gap-1.5 text-xs text-muted hover:text-ink"
            >
              <ArrowLeft className="size-3.5" />
              <span>{demoStep === 1 ? "Volver a mazos" : "Etapa anterior"}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-xs text-muted hover:text-ink hidden sm:inline-flex"
            >
              Quizás más tarde
            </Button>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleNextSubStep}
            disabled={showRealForm || isSubmittingReal}
            className="gap-2 text-xs font-medium"
          >
            <span>
              {demoStep < 5
                ? "Siguiente etapa"
                : createdAppointmentId
                ? "Continuar con la cita guardada"
                : "Continuar a lectura guiada"}
            </span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
