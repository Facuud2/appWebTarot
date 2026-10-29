"use client";

import * as React from "react";
import { Check, Compass, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExperienceLevel = "novice" | "intermediate" | "professional";

interface Step1ExperienceProps {
  value: ExperienceLevel | null;
  onChange: (level: ExperienceLevel) => void;
}

interface ExperienceOption {
  id: ExperienceLevel;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const OPTIONS: ExperienceOption[] = [
  {
    id: "novice",
    title: "Novato",
    description: "Para quienes están comenzando o quieren conocer las cartas y sus símbolos esenciales.",
    icon: Sparkles,
  },
  {
    id: "intermediate",
    title: "Intermedio",
    description: "Para quienes ya conocen las cartas y realizan lecturas ocasionales para sí o personas cercanas.",
    icon: Compass,
  },
  {
    id: "professional",
    title: "Profesional",
    description: "Para quienes realizan lecturas de manera habitual, atienden consultantes o imparten formación.",
    icon: Wand2,
  },
];

export function Step1Experience({ value, onChange }: Step1ExperienceProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-tight">
          ¿Qué tan familiarizado estás con el tarot?
        </h2>
        <p className="text-sm text-muted">
          Selecciona tu punto de partida para que podamos orientar tu espacio de trabajo.
          Todas las herramientas estarán disponibles sin importar el nivel que elijas.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Nivel de familiaridad con el tarot"
        className="grid gap-4 sm:grid-cols-3"
      >
        {OPTIONS.map((opt) => {
          const isSelected = value === opt.id;
          const Icon = opt.icon;

          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(opt.id)}
              className={cn(
                "t-card-interactive group relative flex flex-col justify-between rounded-xl border p-5 text-left transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isSelected
                  ? "border-accent bg-accent/5 ring-1 ring-accent shadow-xs"
                  : "border-border bg-surface hover:border-border-hover hover:bg-surface-raised"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg border transition-colors duration-200",
                      isSelected
                        ? "border-accent/30 bg-accent/10 text-accent"
                        : "border-border bg-ground text-muted group-hover:text-ink"
                    )}
                  >
                    <Icon className="size-5 stroke-[1.75]" />
                  </div>

                  <div
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border transition-colors duration-200",
                      isSelected
                        ? "border-accent bg-accent text-on-primary"
                        : "border-border bg-ground opacity-40 group-hover:opacity-80"
                    )}
                  >
                    {isSelected && <Check className="size-3 stroke-[2.5]" />}
                  </div>
                </div>

                <div>
                  <h3 className="font-serif text-lg font-medium text-ink">
                    {opt.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted">
                {opt.id === "novice" && "Sugerencias arquetípicas y guías guiadas"}
                {opt.id === "intermediate" && "Tiradas versátiles y bitácora de práctica"}
                {opt.id === "professional" && "Agenda de citas, consultantes y notas clínicas"}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-muted leading-relaxed">
        Al elegir una opción continuarás automáticamente al siguiente paso.
      </p>
    </div>
  );
}
