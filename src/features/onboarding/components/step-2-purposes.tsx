"use client";

import * as React from "react";
import {
  BookOpen,
  Calendar,
  Check,
  GraduationCap,
  History,
  LayoutGrid,
  PenTool,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Step2PurposesProps {
  selectedPurposes: string[];
  onChange: (purposes: string[]) => void;
}

interface PurposeOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PURPOSES: PurposeOption[] = [
  {
    id: "record_readings",
    title: "Llevar un registro organizado de mis lecturas",
    description: "Guardar la fecha, cartas en mesa, síntesis y observaciones de cada tirada.",
    icon: History,
  },
  {
    id: "learn_practice",
    title: "Aprender y practicar tarot",
    description: "Realizar ejercicios prácticos y tiradas de autoobservación para ganar confianza.",
    icon: GraduationCap,
  },
  {
    id: "study_cards",
    title: "Estudiar las cartas y sus significados",
    description: "Consultar el catálogo canónico de arcanos mayores, menores, palos y tradiciones.",
    icon: BookOpen,
  },
  {
    id: "manage_appointments",
    title: "Organizar citas y gestionar consultantes",
    description: "Llevar la agenda de turnos, canales de consulta e historial de cada persona.",
    icon: Calendar,
  },
  {
    id: "personal_notes",
    title: "Registrar mis interpretaciones y notas personales",
    description: "Escribir tus propios significados y ver cómo evoluciona tu vínculo con cada naipe.",
    icon: PenTool,
  },
  {
    id: "create_spreads",
    title: "Crear y guardar mis propias estructuras de lectura",
    description: "Diseñar tiradas personalizadas definiendo posiciones, preguntas y geometría en mesa.",
    icon: LayoutGrid,
  },
];

export function Step2Purposes({
  selectedPurposes,
  onChange,
}: Step2PurposesProps) {
  const togglePurpose = (id: string) => {
    if (selectedPurposes.includes(id)) {
      onChange(selectedPurposes.filter((item) => item !== id));
    } else {
      onChange([...selectedPurposes, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-tight">
          ¿Qué te gustaría hacer con la aplicación?
        </h2>
        <p className="text-sm text-muted">
          Puedes seleccionar uno o varios objetivos. Una misma mesa puede servir para estudiar,
          llevar un diario propio y coordinar consultas profesionales.
        </p>
      </div>

      <div
        role="group"
        aria-label="Finalidades de uso del tarot"
        className="grid gap-3 sm:grid-cols-2"
      >
        {PURPOSES.map((p) => {
          const isSelected = selectedPurposes.includes(p.id);
          const Icon = p.icon;

          return (
            <button
              key={p.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => togglePurpose(p.id)}
              className={cn(
                "t-card-interactive group flex items-start gap-3.5 rounded-xl border p-4 text-left transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isSelected
                  ? "border-accent bg-accent/5 ring-1 ring-accent/60 shadow-xs"
                  : "border-border bg-surface hover:border-border-hover hover:bg-surface-raised"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors duration-200",
                  isSelected
                    ? "border-accent bg-accent text-on-primary"
                    : "border-border bg-ground group-hover:border-border-hover"
                )}
              >
                {isSelected && <Check className="t-check-mark size-3.5 stroke-[2.5]" aria-hidden="true" />}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors duration-200",
                      isSelected ? "text-accent" : "text-muted group-hover:text-ink"
                    )}
                  />
                  <h3 className="text-sm font-medium text-ink leading-snug">
                    {p.title}
                  </h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {p.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted pt-1">
        <span>
          {selectedPurposes.length === 0
            ? "Selecciona al menos una finalidad para continuar"
            : `${selectedPurposes.length} ${
                selectedPurposes.length === 1
                  ? "propósito seleccionado"
                  : "propósitos seleccionados"
              }`}
        </span>
      </div>
    </div>
  );
}
