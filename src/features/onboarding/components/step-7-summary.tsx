"use client";

import * as React from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Deck, UserOnboardingState } from "@/types/domain";

interface Step7SummaryProps {
  workspaceName: string;
  onboardingState: UserOnboardingState;
  selectedDeck: Deck | null;
  onComplete: () => void;
  isCompleting: boolean;
}

export function Step7Summary({
  workspaceName,
  onboardingState,
  selectedDeck,
  onComplete,
  isCompleting,
}: Step7SummaryProps) {
  return (
    <div className="space-y-8 t-page-enter">
      {/* Encabezado editorial */}
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-sm font-medium text-accent">
          Configuración inicial lista
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">
          Tu espacio de trabajo está preparado
        </h2>
        <p className="text-sm text-muted max-w-2xl leading-relaxed">
          {workspaceName} ya cuenta con tus preferencias iniciales. A partir de ahora tendrás
          a mano tus tres pilares de trabajo ordenados y sincronizados.
        </p>
      </div>

      {/* Los Tres Pilares del Producto */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Pilar 1: Agenda y turnos */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
              <Calendar className="size-5" />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-lg font-medium text-ink">
                1. Agenda y turnos
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Organización de citas, fichas con expediente de cada consultante,
                modalidades presenciales o virtuales y notas de preparación.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 text-[11px] text-muted flex items-center gap-1.5">
            <span className="font-medium text-ink">Acceso:</span>
            <span>Menú lateral «Agenda» y «Consultantes»</span>
          </div>
        </div>

        {/* Pilar 2: Aprendizaje y educación */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
              <BookOpen className="size-5" />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-lg font-medium text-ink">
                2. Aprendizaje y cartas
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Catálogo canónico multi-tradición (RWS, Marsella, Thoth, Lenormand),
                consulta de arquetipos y bitácora personal de significados.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 text-[11px] text-muted flex items-center gap-1.5">
            <span className="font-medium text-ink">Acceso:</span>
            <span>Menú lateral «Grimorio» y «Fenómenos»</span>
          </div>
        </div>

        {/* Pilar 3: Gestión de lecturas */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
              <History className="size-5" />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-lg font-medium text-ink">
                3. Gestión de lecturas
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Mesas de trabajo interactivas, registro de naipes en posición,
                interpretaciones contextuales y eventos del mazo (saltos, cortes, base).
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 text-[11px] text-muted flex items-center gap-1.5">
            <span className="font-medium text-ink">Acceso:</span>
            <span>Botón «Nueva lectura» o sección «Lecturas»</span>
          </div>
        </div>
      </div>

      {/* Resumen de configuración personal confirmada */}
      <div className="rounded-xl border border-border bg-ground p-5 space-y-3">
        <h4 className="text-xs font-semibold text-muted">
          Tus preferencias iniciales registradas
        </h4>

        <div className="grid gap-2 sm:grid-cols-2 text-xs">
          <div className="flex items-center gap-2 text-muted">
            <CheckCircle2 className="size-4 text-positive shrink-0" />
            <span>
              Mazo principal:{" "}
              <strong className="text-ink font-medium">
                {selectedDeck ? selectedDeck.name : "Exploración libre"}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted">
            <CheckCircle2 className="size-4 text-positive shrink-0" />
            <span>
              Nivel declarado:{" "}
              <strong className="text-ink font-medium capitalize">
                {onboardingState.experienceLevel === "novice" && "Novato"}
                {onboardingState.experienceLevel === "intermediate" && "Intermedio"}
                {onboardingState.experienceLevel === "professional" && "Profesional"}
                {!onboardingState.experienceLevel && "Estándar"}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted">
            <CheckCircle2 className="size-4 text-positive shrink-0" />
            <span>
              Finalidades seleccionadas:{" "}
              <strong className="text-ink font-medium">
                {onboardingState.usagePurposes.length} objetivos registrados
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted">
            <CheckCircle2 className="size-4 text-positive shrink-0" />
            <span>
              Búsqueda rápida: toca la lupa de la barra superior o pulsa ⌘K / Ctrl+K en escritorio.
            </span>
          </div>
        </div>
      </div>

      {/* Botón de finalización */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
        <span className="text-xs text-muted">
          Podrás repasar este tutorial o ajustar tus opciones en cualquier momento desde Ajustes.
        </span>

        <Button
          type="button"
          size="lg"
          variant="primary"
          disabled={isCompleting}
          onClick={onComplete}
          className="w-full sm:w-auto px-8 gap-2 font-medium"
        >
          <span
            key={isCompleting ? "entering" : "idle"}
            className="t-text-swap"
          >
            {isCompleting ? "Ingresando a la mesa…" : "Entrar a mi mesa de tarot"}
          </span>
          <ArrowRight className="size-4.5" />
        </Button>
      </div>
    </div>
  );
}
