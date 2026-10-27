"use client";

import * as React from "react";
import {
  CalendarCheck,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  onAppointmentCreated: (appointmentId: string) => void;
  onSkip: () => void;
  onContinue: () => void;
  demoStep?: number;
  onDemoStepChange?: (step: number) => void;
}

export function Step4AgendaDemo({
  consultants,
  createdAppointmentId,
  hasSkipped: _hasSkipped,
  onAppointmentCreated,
  onSkip,
  onContinue,
  demoStep: externalDemoStep,
  onDemoStepChange,
}: Step4AgendaDemoProps) {
  // Estado de la demostración animada
  const [internalDemoStep, setInternalDemoStep] = React.useState<number>(1);
  const demoStep = externalDemoStep ?? internalDemoStep;
  const setDemoStep = React.useCallback(
    (stepOrFn: number | ((prev: number) => number)) => {
      const next = typeof stepOrFn === "function" ? stepOrFn(demoStep) : stepOrFn;
      setInternalDemoStep(next);
      onDemoStepChange?.(next);
    },
    [demoStep, onDemoStepChange]
  );
  const [isPlayingDemo, setIsPlayingDemo] = React.useState<boolean>(false);

  // Formulario para crear cita real opcional
  const [showRealForm, setShowRealForm] = React.useState<boolean>(false);
  const [isSubmittingReal, setIsSubmittingReal] = React.useState<boolean>(false);

  const [realConsultantName, setRealConsultantName] = React.useState<string>("");
  const [realSelectedConsultantId, setRealSelectedConsultantId] = React.useState<string>(
    consultants[0]?.id || "new"
  );
  const [realTitle, setRealTitle] = React.useState<string>("Lectura de inicio de ciclo");
  const [realDate, setRealDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [realModality, setRealModality] = React.useState<
    "in_person" | "video" | "audio" | "written"
  >("video");
  const [realIntention, setRealIntention] = React.useState<string>("");

  // Reproductor automático de la simulación
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingDemo) {
      timer = setTimeout(() => {
        setDemoStep((prev) => (prev < 5 ? prev + 1 : 1));
      }, 2400);
    }
    return () => clearTimeout(timer);
  }, [isPlayingDemo, setDemoStep]);

  const handleCreateRealAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReal(true);

    try {
      let targetConsultantId = realSelectedConsultantId;

      // Si necesita crear un consultante al vuelo
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

      {/* Tarjeta de la Demostración Interactiva Animada */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        {/* Barra superior de la demo */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-ground px-4 py-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Demostración ilustrativa
            </Badge>
            <span className="text-xs text-muted">
              Paso {demoStep} de 5
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsPlayingDemo((p) => !p)}
              className="text-xs h-7 px-2.5 gap-1.5"
            >
              {isPlayingDemo ? (
                <>
                  <RotateCcw className="size-3" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="size-3 fill-current" />
                  <span>Reproducir demostración</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Pasos interactivos de la demo */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Navegación cómoda de las 5 etapas (scroll horizontal suave en móviles, grid en sm+) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:gap-2 sm:pb-0 no-scrollbar">
            {AGENDA_DEMO_STAGES.map((st) => {
              const isActive = demoStep === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setDemoStep(st.id);
                    setIsPlayingDemo(false);
                  }}
                  className={cn(
                    "flex-1 shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 outline-none text-center",
                    isActive
                      ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30 font-semibold shadow-xs"
                      : "text-muted hover:text-ink hover:bg-surface-raised border border-transparent"
                  )}
                >
                  <span className="sm:hidden">{st.id}. {st.shortLabel}</span>
                  <span className="hidden sm:inline">{st.id}. {st.label}</span>
                </button>
              );
            })}
          </div>

          {/* Escenario animado de la demo */}
          <div className="relative min-h-[170px] rounded-lg border border-border bg-ground p-4 flex flex-col justify-center">
            {demoStep === 1 && (
              <div className="space-y-2 t-fade-rise">
                <div className="flex items-center gap-2 text-accent font-medium text-xs">
                  <CalendarPlus className="size-4" />
                  <span>Acceso rápido desde el panel</span>
                </div>
                <h4 className="font-serif text-lg text-ink font-medium">
                  1. Hacer clic en «Agendar cita»
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  En cualquier momento desde la barra superior de la mesa o desde la sección Agenda,
                  abres el diálogo de turnos con un solo clic.
                </p>
                <div className="pt-2 flex gap-2">
                  <div className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-ink flex items-center gap-1.5 shadow-2xs">
                    <CalendarPlus className="size-3.5 text-accent" />
                    <span>Agendar cita</span>
                  </div>
                </div>
              </div>
            )}

            {demoStep === 2 && (
              <div className="space-y-2 t-fade-rise">
                <div className="flex items-center gap-2 text-accent font-medium text-xs">
                  <Clock className="size-4" />
                  <span>Definición temporal y modalidad</span>
                </div>
                <h4 className="font-serif text-lg text-ink font-medium">
                  2. Seleccionar fecha, horario y formato
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  Indica si el encuentro será presencial en tu mesa de estudio, por videollamada,
                  audio o informe escrito, y define la duración estimada.
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  <span className="rounded bg-surface px-2.5 py-1 border border-border text-ink">
                    Viernes 17:00 hs (60 min)
                  </span>
                  <span className="rounded bg-accent/10 px-2.5 py-1 text-accent border border-accent/20">
                    Modalidad: Videollamada
                  </span>
                </div>
              </div>
            )}

            {demoStep === 3 && (
              <div className="space-y-2 t-fade-rise">
                <div className="flex items-center gap-2 text-accent font-medium text-xs">
                  <UserCheck className="size-4" />
                  <span>Ficha del consultante</span>
                </div>
                <h4 className="font-serif text-lg text-ink font-medium">
                  3. Elegir o crear el consultante
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  Puedes buscar a una persona de tu lista previa o escribir su nombre para registrarla
                  directamente sin salir del formulario.
                </p>
                <div className="rounded border border-border bg-surface p-2 text-xs text-ink max-w-sm flex items-center justify-between">
                  <span>Mariana Echeverría (Arquitecta)</span>
                  <Badge variant="neutral" className="text-[10px]">
                    Presencial
                  </Badge>
                </div>
              </div>
            )}

            {demoStep === 4 && (
              <div className="space-y-2 t-fade-rise">
                <div className="flex items-center gap-2 text-accent font-medium text-xs">
                  <Sparkles className="size-4" />
                  <span>Foco de la lectura</span>
                </div>
                <h4 className="font-serif text-lg text-ink font-medium">
                  4. Anotar la intención o inquietud inicial
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  Registra qué desea explorar el consultante: una decisión profesional, un cierre
                  de ciclo o una pregunta abierta para tenerla visible antes de la sesión.
                </p>
                <div className="rounded border border-border/80 bg-surface/80 p-2 text-xs text-muted italic">
                  «¿Qué criterio conviene priorizar al encarar los primeros proyectos en solitario?»
                </div>
              </div>
            )}

            {demoStep === 5 && (
              <div className="space-y-2 t-fade-rise">
                <div className="flex items-center gap-2 text-positive font-medium text-xs">
                  <CalendarCheck className="size-4" />
                  <span>Cita confirmada en tu agenda</span>
                </div>
                <h4 className="font-serif text-lg text-ink font-medium">
                  5. Guardada y lista para iniciar la lectura
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  La cita queda agendada. Cuando llegue el momento de la consulta, podrás hacer clic
                  en «Iniciar lectura» para abrir la mesa de tirada con los datos ya vinculados.
                </p>
                <div className="flex items-center gap-2 text-xs text-positive font-medium">
                  <Check className="size-4" />
                  <span>Cita visible en la cronología de hoy y próximas fechas</span>
                </div>
              </div>
            )}
          </div>

          {/* Navegación rápida entre etapas */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              disabled={demoStep <= 1}
              onClick={() => {
                setDemoStep((prev) => Math.max(1, prev - 1));
                setIsPlayingDemo(false);
              }}
              className="inline-flex items-center gap-1 text-muted hover:text-ink disabled:opacity-30 disabled:pointer-events-none transition-colors py-1 px-2 rounded hover:bg-surface-raised"
            >
              <ChevronLeft className="size-3.5" />
              <span>Etapa anterior</span>
            </button>

            <span className="text-[11px] font-mono text-muted">
              {demoStep} / 5
            </span>

            <button
              type="button"
              disabled={demoStep >= 5}
              onClick={() => {
                setDemoStep((prev) => Math.min(5, prev + 1));
                setIsPlayingDemo(false);
              }}
              className="inline-flex items-center gap-1 text-amber-500 dark:text-amber-400 font-medium hover:underline disabled:opacity-30 disabled:pointer-events-none transition-colors py-1 px-2 rounded hover:bg-amber-500/10"
            >
              <span>Siguiente etapa</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          {/* Aclaración de lecturas espontáneas */}
          <div className="rounded-lg border border-border/70 bg-surface p-3.5 text-xs text-muted flex items-start gap-2.5">
            <HelpCircle className="size-4 text-accent shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <strong className="text-ink font-medium">
                ¿Y si realizas una lectura espontánea en el momento?
              </strong>
              <p>
                No necesitas programar una cita. Puedes hacer clic en «Nueva lectura» directamente
                para abrir la mesa de cartas y registrar una sesión en tiempo real.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Opción de registrar primera cita real */}
      <div className="rounded-xl border border-border bg-ground p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-ink">
              ¿Deseas agendar tu primera cita real ahora?
            </h3>
            <p className="text-xs text-muted">
              Si ya tienes una sesión programada para esta semana, puedes dejarla guardada ahora.
              Es opcional y puedes omitirlo.
            </p>
          </div>

          {!showRealForm && !createdAppointmentId && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowRealForm(true)}
              className="shrink-0 text-xs"
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

        {/* Formulario real desplegable */}
        {showRealForm && (
          <form
            onSubmit={handleCreateRealAppointment}
            className="space-y-4 pt-3 border-t border-border t-fade-rise"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="real-appt-consultant" requiredIndicator>
                  Consultante
                </Label>
                {consultants.length > 0 ? (
                  <select
                    id="real-appt-consultant"
                    value={realSelectedConsultantId}
                    onChange={(e) => setRealSelectedConsultantId(e.target.value)}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  >
                    {consultants.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName}
                      </option>
                    ))}
                    <option value="new">+ Registrar nueva persona</option>
                  </select>
                ) : (
                  <Input
                    id="real-appt-consultant-name"
                    placeholder="Nombre completo del consultante"
                    value={realConsultantName}
                    onChange={(e) => setRealConsultantName(e.target.value)}
                    required
                  />
                )}
              </div>

              {consultants.length > 0 && realSelectedConsultantId === "new" && (
                <div className="space-y-1.5">
                  <Label htmlFor="real-appt-new-name" requiredIndicator>
                    Nombre del nuevo consultante
                  </Label>
                  <Input
                    id="real-appt-new-name"
                    placeholder="Ej. Sofía Herrera"
                    value={realConsultantName}
                    onChange={(e) => setRealConsultantName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="real-appt-title" requiredIndicator>
                  Título o motivo de la sesión
                </Label>
                <Input
                  id="real-appt-title"
                  placeholder="Ej. Lectura semestral de orientación"
                  value={realTitle}
                  onChange={(e) => setRealTitle(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="real-appt-date" requiredIndicator>
                  Fecha y horario
                </Label>
                <Input
                  id="real-appt-date"
                  type="datetime-local"
                  value={realDate}
                  onChange={(e) => setRealDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="real-appt-modality">Modalidad</Label>
                <select
                  id="real-appt-modality"
                  value={realModality}
                  onChange={(e) =>
                    setRealModality(
                      e.target.value as "in_person" | "video" | "audio" | "written"
                    )
                  }
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="video">Videollamada</option>
                  <option value="in_person">Presencial en mesa</option>
                  <option value="audio">Llamada de audio</option>
                  <option value="written">Informe escrito</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="real-appt-intention">Pregunta o intención previa (opcional)</Label>
              <Textarea
                id="real-appt-intention"
                placeholder="Notas de contexto o preguntas que el consultante anticipó..."
                value={realIntention}
                onChange={(e) => setRealIntention(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowRealForm(false)}
                disabled={isSubmittingReal}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmittingReal}
              >
                {isSubmittingReal ? "Guardando cita…" : "Guardar cita real"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Botones de acción del paso: Guardar y continuar o Quizás más tarde */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          className="text-xs text-muted hover:text-ink"
        >
          <span>Quizás más tarde</span>
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={onContinue}
          className="gap-2"
        >
          <span>
            {createdAppointmentId
              ? "Continuar con la cita guardada"
              : "Guardar y continuar"}
          </span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
