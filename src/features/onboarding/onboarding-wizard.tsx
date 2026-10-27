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
import { Step6Summary } from "@/features/onboarding/components/step-6-summary";
import { Button } from "@/components/ui/button";
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

const STEP_TITLES = [
  "Nivel de experiencia",
  "Finalidad de uso",
  "Mazo de tarot principal",
  "Gestión de citas y turnos",
  "Primera lectura guiada",
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
      currentStep: ob?.currentStep ?? 1,
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
  const [agendaDemoStep, setAgendaDemoStep] = React.useState<number>(1);

  // Mazo seleccionado resuelto
  const selectedDeck = React.useMemo(() => {
    if (!onboardingState.selectedDeckId) return null;
    return decks.find((d) => d.id === onboardingState.selectedDeckId) ?? null;
  }, [decks, onboardingState.selectedDeckId]);

  // Persistir cambios parciales al servidor
  const persistProgress = async (partial: Partial<UserOnboardingState>) => {
    setIsSaving(true);
    try {
      const nextState = { ...onboardingState, ...partial };
      setOnboardingState(nextState);

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

  // Avanzar al siguiente paso
  const handleNext = async () => {
    if (onboardingState.currentStep >= 6) return;
    const nextStep = onboardingState.currentStep + 1;
    await persistProgress({ currentStep: nextStep });
  };

  // Retroceder al paso anterior
  const handlePrev = async () => {
    if (onboardingState.currentStep <= 1) return;
    const prevStep = onboardingState.currentStep - 1;
    await persistProgress({ currentStep: prevStep });
  };

  // Completar onboarding
  const handleComplete = async () => {
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

  // Validación para habilitar el botón "Siguiente"
  const isNextDisabled = React.useMemo(() => {
    if (isSaving) return true;
    switch (onboardingState.currentStep) {
      case 1:
        return !onboardingState.experienceLevel;
      case 2:
        return onboardingState.usagePurposes.length === 0;
      case 3:
        // Debe haber elegido un mazo o marcado "Todavía estoy explorando"
        return !onboardingState.selectedDeckId && !isExploringDeck;
      case 4:
        return false; // El paso 4 tiene sus propios botones
      case 5:
        return false; // El paso 5 tiene sus propios botones
      case 6:
        return false;
      default:
        return false;
    }
  }, [
    isSaving,
    onboardingState.currentStep,
    onboardingState.experienceLevel,
    onboardingState.usagePurposes,
    onboardingState.selectedDeckId,
    isExploringDeck,
  ]);

  return (
    <div className="min-h-dvh bg-ground flex flex-col justify-between">
      {/* BARRA SUPERIOR EDITORIAL */}
      <header className="border-b border-border bg-ground sticky top-0 z-30 px-4 py-3 sm:px-8">
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
              Paso {onboardingState.currentStep} de 6 ·{" "}
              <span className="text-ink font-medium">
                {STEP_TITLES[onboardingState.currentStep - 1]}
              </span>
            </span>

            <span className="text-xs text-muted sm:hidden">
              {onboardingState.currentStep}/6
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
          <div className="grid grid-cols-6 gap-1 h-1">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={cn(
                  "rounded-full transition-colors duration-300",
                  s <= onboardingState.currentStep
                    ? "bg-accent"
                    : "bg-surface-raised border border-border/50"
                )}
              />
            ))}
          </div>

          {/* Sub barra de otro color para las 5 etapas del paso 4 */}
          {onboardingState.currentStep === 4 && (
            <div className="pt-1 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-medium">
                  <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
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
                    onClick={() => setAgendaDemoStep(st)}
                    title={`Etapa ${st}: ${AGENDA_DEMO_STAGES[st - 1]?.label}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300 outline-none focus-visible:ring-1 focus-visible:ring-amber-500 cursor-pointer",
                      st <= agendaDemoStep
                        ? "bg-amber-500 dark:bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
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
      <main className="flex-1 px-4 py-8 sm:px-8 flex items-center justify-center">
        <div className="w-full max-w-3xl">
          {onboardingState.currentStep === 1 && (
            <Step1Experience
              value={onboardingState.experienceLevel}
              onChange={(level) => persistProgress({ experienceLevel: level })}
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
                persistProgress({
                  selectedDeckId: deckId,
                });
              }}
              onDeckCreated={(newDeck) => {
                setDecks((prev) => [newDeck, ...prev]);
                persistProgress({
                  customDeckCreatedId: newDeck.id,
                  selectedDeckId: newDeck.id,
                });
              }}
            />
          )}

          {onboardingState.currentStep === 4 && (
            <Step4AgendaDemo
              consultants={consultants}
              createdAppointmentId={onboardingState.createdAppointmentId}
              hasSkipped={onboardingState.skippedAppointmentDemo}
              demoStep={agendaDemoStep}
              onDemoStepChange={setAgendaDemoStep}
              onAppointmentCreated={(apptId) =>
                persistProgress({
                  createdAppointmentId: apptId,
                  skippedAppointmentDemo: false,
                })
              }
              onSkip={async () => {
                await persistProgress({
                  skippedAppointmentDemo: true,
                  currentStep: 5,
                });
              }}
              onContinue={handleNext}
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
                await persistProgress({
                  skippedReadingDemo: true,
                  currentStep: 6,
                });
              }}
              onContinue={handleNext}
            />
          )}

          {onboardingState.currentStep === 6 && (
            <Step6Summary
              workspaceName={user.workspaceName}
              onboardingState={onboardingState}
              selectedDeck={selectedDeck}
              onComplete={handleComplete}
              isCompleting={isCompleting}
            />
          )}
        </div>
      </main>

      {/* BARRA INFERIOR DE NAVEGACIÓN (Pasos 1, 2, 3) */}
      {[1, 2, 3].includes(onboardingState.currentStep) && (
        <footer className="border-t border-border bg-ground px-4 py-4 sm:px-8">
          <div className="mx-auto max-w-3xl flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="ghost"
              disabled={onboardingState.currentStep === 1 || isSaving}
              onClick={handlePrev}
              className="gap-2 text-xs text-muted hover:text-ink"
            >
              <ArrowLeft className="size-4" />
              <span>Anterior</span>
            </Button>

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
          </div>
        </footer>
      )}
    </div>
  );
}
