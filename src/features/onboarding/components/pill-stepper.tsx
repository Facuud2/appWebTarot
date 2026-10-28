"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface PillStepperProps {
  currentSubstep: 1 | 2;
  onSelectSubstep?: (step: 1 | 2) => void;
  className?: string;
}

export function PillStepper({
  currentSubstep,
  onSelectSubstep,
  className,
}: PillStepperProps) {
  const steps: Array<{ id: 1 | 2; label: string; title: string }> = [
    { id: 1, label: "Destinatario", title: "Para quién es la lectura" },
    { id: 2, label: "Mesa", title: "Mesa de cartas y estructura" },
  ];

  return (
    <div
      role="group"
      aria-label="Progreso del tutorial de lectura"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-xs select-none",
        className
      )}
    >
      {steps.map((step) => {
        const isActive = currentSubstep === step.id;
        const isClickable = Boolean(onSelectSubstep);

        return (
          <button
            key={step.id}
            type="button"
            disabled={!isClickable}
            onClick={() => onSelectSubstep?.(step.id)}
            aria-current={isActive ? "step" : undefined}
            title={step.title}
            className={cn(
              "relative z-10 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent",
              isActive
                ? "text-on-primary"
                : "text-muted hover:text-ink cursor-pointer",
              !isClickable && "cursor-default"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="pill-active-bubble"
                className="absolute inset-0 z-[-1] rounded-full bg-primary shadow-xs"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 32,
                  mass: 0.8,
                }}
              />
            )}
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors duration-200",
                isActive
                  ? "bg-ground text-ink"
                  : "bg-surface-raised border border-border text-muted"
              )}
            >
              {step.id}
            </span>
            <span className="hidden sm:inline font-sans">{step.title}</span>
            <span className="sm:hidden font-sans">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}
