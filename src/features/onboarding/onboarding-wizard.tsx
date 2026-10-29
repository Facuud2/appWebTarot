"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  completeOnboardingAction,
  saveOnboardingProgressAction,
} from "@/actions/onboarding-actions";
import { Step1Experience } from "@/features/onboarding/components/step-1-experience";
import { Step2Purposes } from "@/features/onboarding/components/step-2-purposes";
import { Step3Deck } from "@/features/onboarding/components/step-3-deck";
import {
  Step4AgendaDemo,
  AGENDA_DEMO_STAGES,
} from "@/features/onboarding/components/step-4-agenda-demo";
import { Step5ReadingTutorial } from "@/features/onboarding/components/step-5-reading-tutorial";
import { Step6InstallApp } from "@/features/onboarding/components/step-6-install-app";
import { Step7Summary } from "@/features/onboarding/components/step-7-summary";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/components/providers/pwa-install-provider";
import { cn } from "@/lib/utils";
import type {
  CanonicalCard,
  Consultant,
  Deck,
  SpreadTemplate,
  User,
  UserOnboardingState,
} from "@/types/domain";

interface OnboardingWizardProps {
  user: User;
  initialDecks: Deck[];
  canonicalCards: CanonicalCard[];
  spreads: SpreadTemplate[];
  initialConsultants: Consultant[];
  isReviewMode?: boolean;
}

const TOTAL_STEPS = 7;

const STEP_TITLES = [
  "Nivel de experiencia",
  "Finalidad de uso",
  "Mazo de tarot principal",
  "Gestión de citas y turnos",
  "Primera lectura guiada",
  "Instalación de la aplicación",
  "Resumen y bienvenida",
];

export function OnboardingWizard({
  user,
  initialDecks,
  canonicalCards,
  spreads,
  initialConsultants,
  isReviewMode = false,
}: OnboardingWizardProps) {
  // Estado local sincronizado con user.preferences.onboarding
  const [onboardingState, setOnboardingState] = React.useState<UserOnboardingState>(() => {
    const ob = user.preferences.onboarding;
    return {
      completed: ob?.completed ?? false,
      currentStep: isReviewMode ? 1 : (ob?.currentStep ?? 1),
      experienceLevel: ob?.experienceLevel ?? null,
      usagePurposes: ob?.usagePurposes ?? [],
      selectedDeckId: ob?.selectedDeckId ?? user.preferences.defaultDeckId ?? null,
      customDeckCreatedId: ob?.customDeckCreatedId ?? null,
      skippedAppointmentDemo: ob?.skippedAppointmentDemo ?? false,
      createdAppointmentId: ob?.createdAppointmentId ?? null,
      skippedReadingDemo: ob?.skippedReadingDemo ?? false,
      createdReadingId: ob?.createdReadingId ?? null,
      readingTargetType: ob?.readingTargetType ?? null,
      targetConsultantId: ob?.targetConsultantId ?? null,
      completedAt: ob?.completedAt ?? null,
      updatedAt: ob?.updatedAt ?? new Date().toISOString(),
    };
  });

  const [decks, setDecks] = React.useState<Deck[]>(initialDecks);
  const consultants = initialConsultants;
  const [isExploringDeck, setIsExploringDeck] = React.useState<boolean>(
    onboardingState.selectedDeckId === null && onboardingState.currentStep > 3
  );

  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [isCompleting, setIsCompleting] = React.useState<boolean>(false);
  const [stepDirection, setStepDirection] = React.useState<"forward" | "backward">("forward");
  const [agendaDemoStep, setAgendaDemoStep] = React.useState<number>(1);
  const [agendaSubDirection, setAgendaSubDirection] = React.useState<"forward" | "backward">("forward");
  const scrollRootRef = React.useRef<HTMLDivElement>(null);
  const pendingAdvanceRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const { install } = usePwaInstall();

  React.useEffect(() => {
    return () => {
      if (pendingAdvanceRef.current) {
        clearTimeout(pendingAdvanceRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.scrollingElement?.scrollTo({ top: 0, behavior: "smooth" });

    for (
      let ancestor = scrollRootRef.current?.parentElement;
      ancestor && ancestor !== document.body;
      ancestor = ancestor.parentElement
    ) {
      const { overflowY } = window.getComputedStyle(ancestor);
      if (
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        ancestor.scrollHeight > ancestor.clientHeight
      ) {
        ancestor.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [onboardingState.currentStep, agendaDemoStep]);

  const handleAgendaSubStepChange = (
    nextSubStep: number,
    dir?: "forward" | "backward"
  ) => {
    const direction =
      dir ?? (nextSubStep >= agendaDemoStep ? "forward" : "backward");
    setAgendaSubDirection(direction);
    setAgendaDemoStep(nextSubStep);
  };

  // Mazo seleccionado resuelto
  const selectedDeck = React.useMemo(() => {
    if (!onboardingState.selectedDeckId) return null;
    return decks.find((d) => d.id === onboardingState.selectedDeckId) ?? null;
  }, [decks, onboardingState.selectedDeckId]);

  // Persistir cambios parciales al servidor
  const persistProgress = async (partial: Partial<UserOnboardingState>) => {
    setIsSaving(true);
    try {
      setOnboardingState((prev) => ({ ...prev, ...partial }));

      const res = await saveOnboardingProgressAction(partial);
      if (!res.ok) {
        toast.error(res.error || "No se pudo sincronizar el progreso.");
      }
    } catch {
      toast.error("Error al conectar con el servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelPendingAdvance = () => {
    if (pendingAdvanceRef.current) {
      clearTimeout(pendingAdvanceRef.current);
      pendingAdvanceRef.current = null;
    }
  };

  // Los pasos de selección simple avanzan solos tras confirmar la elección.
  const advanceWithSelection = (partial: Partial<UserOnboardingState>) => {
    if (isSaving) return;
    cancelPendingAdvance();
    setStepDirection("forward");
    setOnboardingState((prev) => ({ ...prev, ...partial }));

    const nextStep = onboardingState.currentStep + 1;
    pendingAdvanceRef.current = setTimeout(() => {
      pendingAdvanceRef.current = null;
      void persistProgress({ ...partial, currentStep: nextStep });
    }, 240);
  };

  // Avanzar al siguiente paso con deslizamiento iOS
  const handleNext = async () => {
    cancelPendingAdvance();
    if (onboardingState.currentStep >= TOTAL_STEPS) return;
    setStepDirection("forward");
    const nextStep = onboardingState.currentStep + 1;
    await persistProgress({ currentStep: nextStep });
  };

  // Retroceder al paso anterior con deslizamiento inverso
  const handlePrev = async () => {
    cancelPendingAdvance();
    if (onboardingState.currentStep <= 1) return;
    setStepDirection("backward");
    const prevStep = onboardingState.currentStep - 1;
    await persistProgress({ currentStep: prevStep });
  };

  // Instalar la PWA: primero se completa el onboarding para que la app
  // instalada abra directamente la mesa y no vuelva a pedir el tutorial.
  const handleInstallApp = async () => {
    if (isSaving) return;
    cancelPendingAdvance();
    setIsSaving(true);
    try {
      const res = await completeOnboardingAction();
      if (!res.ok) {
        toast.error(res.error || "No se pudo preparar la instalación.");
        return;
      }

      await install();

      setStepDirection("forward");
      await persistProgress({ currentStep: 7 });
    } catch {
      toast.error("No se pudo iniciar la instalación de la aplicación.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipInstall = async () => {
    cancelPendingAdvance();
    setStepDirection("forward");
    await persistProgress({ currentStep: 7 });
  };

  // Completar onboarding
  const handleComplete = async () => {
    cancelPendingAdvance();
    setIsCompleting(true);
    try {
      const res = await completeOnboardingAction();
      if (!res.ok) {
        toast.error(res.error || "No se pudo confirmar la finalización.");
        setIsCompleting(false);
        return;
      }

      toast.success("¡Onboarding completado!");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Transición limpia entre layouts independientes (onboarding -> app shell) con cookie de sesión renovada
      window.location.assign("/");
    } catch {
      toast.error("Error al finalizar el tutorial.");
      setIsCompleting(false);
    }
  };

  // Validación para habilitar el botón "Siguiente" del paso de preferencias
  const isNextDisabled = React.useMemo(() => {
    if (isSaving) return true;
    if (onboardingState.currentStep === 2) {
      return onboardingState.usagePurposes.length === 0;
    }
    return false;
  }, [isSaving, onboardingState.currentStep, onboardingState.usagePurposes]);

  return (
    <div ref={scrollRootRef} className="min-h-dvh bg-ground flex flex-col justify-between">
      {/* BARRA SUPERIOR EDITORIAL */}
      <header className="standalone-safe-header border-b border-border bg-ground sticky top-0 z-30 px-4 py-3 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] sm:px-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 28 28"
              fill="none"
              className="size-6 shrink-0"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="2.5"
                width="20"
                height="23"
                rx="3"
                className="stroke-ink"
                strokeWidth="1.7"
              />
              <circle
                cx="14"
                cy="14"
                r="4.5"
                className="stroke-accent"
                strokeWidth="1.7"
              />
            </svg>
            <div className="leading-none">
              <span className="font-serif text-lg font-medium text-ink block">
                Grimorio Tarot
              </span>
              <span className="text-[11px] text-muted font-sans">
                {user.workspaceName}
              </span>
            </div>
          </div>

          {/* Indicador de paso actual */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted hidden sm:inline">
              Paso {onboardingState.currentStep} de {TOTAL_STEPS} ·{" "}
              <span className="text-ink font-medium">
                {STEP_TITLES[onboardingState.currentStep - 1]}
              </span>
            </span>

            <span className="text-xs text-muted sm:hidden">
              {onboardingState.currentStep}/{TOTAL_STEPS}
            </span>

            {isReviewMode && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Retorno limpio a la mesa de trabajo
                  window.location.assign("/");
                }}
                className="text-xs h-7 px-2"
              >
                Cerrar repaso
              </Button>
            )}
          </div>
        </div>

        {/* Barra de progreso segmentada */}
        <div className="mx-auto max-w-4xl pt-2 space-y-2">
          <div className="grid grid-cols-7 gap-1 h-1">
            {Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1).map(
              (s) => (
                <div
                  key={s}
                  className={cn(
                    "rounded-full transition-colors duration-300",
                    s <= onboardingState.currentStep
                      ? "bg-accent"
                      : "bg-surface-raised border border-border/50"
                  )}
                />
              )
            )}
          </div>

          {/* Sub barra de otro color para las 5 etapas del paso 4 */}
          {onboardingState.currentStep === 4 && (
            <div className="pt-1 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-medium">
                  <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                  <span>
                    Etapa {agendaDemoStep} de 5:{" "}
                    <strong className="text-ink font-semibold">
                      {AGENDA_DEMO_STAGES[agendaDemoStep - 1]?.label}
                    </strong>
                  </span>
                </div>
                <span className="text-[10px] text-muted">
                  Demostración de agenda
                </span>
              </div>
              <div
                className="grid grid-cols-5 gap-1.5 h-1.5"
                role="progressbar"
                aria-valuenow={agendaDemoStep}
                aria-valuemin={1}
                aria-valuemax={5}
                aria-label="Progreso de las 5 etapas de agenda"
              >
                {[1, 2, 3, 4, 5].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleAgendaSubStepChange(st)}
                    title={`Etapa ${st}: ${AGENDA_DEMO_STAGES[st - 1]?.label}`}
                    className={cn(
                      "h-1.5 rounded-full transition-colors duration-300 outline-none focus-visible:ring-1 focus-visible:ring-amber-500 cursor-pointer",
                      st <= agendaDemoStep
                        ? "bg-amber-500 dark:bg-amber-400"
                        : "bg-surface-raised border border-border/40 hover:bg-border"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ÁREA CENTRAL DE CONTENIDO DINÁMICO */}
      <main className="flex-1 px-4 py-8 sm:px-8 flex items-center justify-center overflow-x-hidden">
        <div className="w-full max-w-3xl">
          <div
            key={onboardingState.currentStep}
            className={cn(
              "w-full",
              stepDirection === "forward" ? "t-slide-forward" : "t-slide-backward"
            )}
          >
            {onboardingState.currentStep === 1 && (
              <Step1Experience
                value={onboardingState.experienceLevel}
                onChange={(level) =>
                  advanceWithSelection({ experienceLevel: level })
                }
              />
            )}

            {onboardingState.currentStep === 2 && (
              <Step2Purposes
                selectedPurposes={onboardingState.usagePurposes}
                onChange={(purposes) =>
                  persistProgress({ usagePurposes: purposes })
                }
              />
            )}

            {onboardingState.currentStep === 3 && (
              <Step3Deck
                decks={decks}
                selectedDeckId={onboardingState.selectedDeckId}
                isExploringMode={isExploringDeck}
                onSelectDeck={(deckId, isExploring) => {
                  setIsExploringDeck(isExploring);
                  advanceWithSelection({ selectedDeckId: deckId });
                }}
                onDeckCreated={(newDeck) => {
                  setDecks((prev) => [newDeck, ...prev]);
                  advanceWithSelection({
                    customDeckCreatedId: newDeck.id,
                    selectedDeckId: newDeck.id,
                  });
                }}
                onOpenCreateDeck={cancelPendingAdvance}
              />
            )}

            {onboardingState.currentStep === 4 && (
              <Step4AgendaDemo
                consultants={consultants}
                createdAppointmentId={onboardingState.createdAppointmentId}
                hasSkipped={onboardingState.skippedAppointmentDemo}
                demoStep={agendaDemoStep}
                subDirection={agendaSubDirection}
                onDemoStepChange={handleAgendaSubStepChange}
                onAppointmentCreated={(apptId) =>
                  persistProgress({
                    createdAppointmentId: apptId,
                    skippedAppointmentDemo: false,
                  })
                }
                onSkip={async () => {
                  setStepDirection("forward");
                  await persistProgress({
                    skippedAppointmentDemo: true,
                    currentStep: 5,
                  });
                }}
                onContinue={handleNext}
                onPrevStep={handlePrev}
              />
            )}

            {onboardingState.currentStep === 5 && (
              <Step5ReadingTutorial
                userFullName={user.name}
                consultants={consultants}
                canonicalCards={canonicalCards}
                spreads={spreads}
                selectedDeck={selectedDeck}
                targetType={onboardingState.readingTargetType}
                selectedConsultantId={onboardingState.targetConsultantId}
                createdReadingId={onboardingState.createdReadingId}
                hasSkippedReading={onboardingState.skippedReadingDemo}
                onTargetSelected={(type, consultantId) =>
                  persistProgress({
                    readingTargetType: type,
                    targetConsultantId: consultantId,
                  })
                }
                onReadingCreated={(readingId) =>
                  persistProgress({
                    createdReadingId: readingId,
                    skippedReadingDemo: false,
                  })
                }
                onSkip={async () => {
                  setStepDirection("forward");
                  await persistProgress({
                    skippedReadingDemo: true,
                    currentStep: 6,
                  });
                }}
                onContinue={handleNext}
              />
            )}

            {onboardingState.currentStep === 6 && (
              <Step6InstallApp
                isSubmitting={isSaving}
                isReviewMode={isReviewMode}
                onInstall={() => {
                  void handleInstallApp();
                }}
                onContinueWithoutInstall={() => {
                  void handleSkipInstall();
                }}
                onBack={() => {
                  void handlePrev();
                }}
              />
            )}

            {onboardingState.currentStep === 7 && (
              <Step7Summary
                workspaceName={user.workspaceName}
                onboardingState={onboardingState}
                selectedDeck={selectedDeck}
                onComplete={handleComplete}
                isCompleting={isCompleting}
              />
            )}
          </div>
        </div>
      </main>

      {/* BARRA INFERIOR DE NAVEGACIÓN (Paso de preferencias y Paso 3) */}
      {[2, 3].includes(onboardingState.currentStep) && (
        <footer className="border-t border-border bg-ground px-4 py-4 sm:px-8">
          <div className="mx-auto max-w-3xl flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="ghost"
              disabled={isSaving}
              onClick={handlePrev}
              className="gap-2 text-xs text-muted hover:text-ink"
            >
              <ArrowLeft className="size-4" />
              <span>Anterior</span>
            </Button>

            {onboardingState.currentStep === 2 ? (
              <Button
                type="button"
                variant="primary"
                disabled={isNextDisabled}
                onClick={handleNext}
                className="gap-2"
              >
                <span>{isSaving ? "Guardando…" : "Siguiente"}</span>
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
          </div>
        </footer>
      )}
    </div>
  );
}
