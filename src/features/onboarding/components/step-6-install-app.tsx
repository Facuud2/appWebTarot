"use client";

import * as React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/components/providers/pwa-install-provider";

interface Step6InstallAppProps {
  isSubmitting: boolean;
  onInstall: () => void;
  onContinueWithoutInstall: () => void;
  onBack: () => void;
  isReviewMode?: boolean;
}

const BENEFITS = [
  {
    icon: Smartphone,
    title: "Acceso directo",
    description:
      "Abre Grimorio con un toque desde la pantalla de inicio, como cualquier otra aplicación.",
  },
  {
    icon: Monitor,
    title: "Pantalla completa",
    description:
      "Tu mesa gana espacio y desaparecen las barras del navegador durante las lecturas.",
  },
  {
    icon: CheckCircle2,
    title: "Todo se conserva",
    description:
      "Tu sesión, tus preferencias y el progreso del tutorial quedan guardados al instalar.",
  },
];

export function Step6InstallApp({
  isSubmitting,
  onInstall,
  onContinueWithoutInstall,
  onBack,
  isReviewMode = false,
}: Step6InstallAppProps) {
  const { isStandalone, platform, hasDeferredPrompt } = usePwaInstall();
  const isIOS = platform.startsWith("ios-") || platform.startsWith("ipados-");

  return (
    <div className="space-y-8 t-fade-rise">
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-sm font-medium text-accent">
          {isReviewMode ? "Instalación" : "Casi listo"}
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl text-ink leading-tight">
          Instala Grimorio en tu dispositivo
        </h2>
        <p className="text-sm text-muted max-w-2xl leading-relaxed">
          Lleva tu mesa de tarot contigo y ábrela a pantalla completa. La
          instalación no borra nada: tu espacio de trabajo y este tutorial
          permanecen intactos.
        </p>
      </div>

      {isStandalone ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-positive/30 bg-positive/5 p-5"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-positive" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink">
              Ya estás usando la aplicación instalada
            </p>
            <p className="text-xs leading-relaxed text-muted">
              Grimorio se abrió en modo pantalla completa. Puedes continuar
              directamente al resumen y entrar a tu mesa.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-surface p-4 space-y-3"
              >
                <div className="flex size-9 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
                  <Icon className="size-4.5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-ink">{title}</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-ground p-5 space-y-2">
            <h3 className="text-sm font-medium text-ink">Cómo instalarla</h3>
            <p className="text-xs text-muted leading-relaxed">
              {isIOS
                ? "Al pulsar «Instalar aplicación» verás los pasos exactos para añadir Grimorio a tu pantalla de inicio desde Safari o Chrome."
                : hasDeferredPrompt
                  ? "Pulsa «Instalar aplicación» y confirma el aviso del navegador. La app se abrirá en pantalla completa desde su nuevo acceso."
                  : "Pulsa «Instalar aplicación» para ver los pasos según tu navegador. También puedes instalarla desde el menú del navegador, en «Instalar aplicación» o «Agregar a la pantalla principal»."}
            </p>
            <p className="text-[11px] text-muted leading-relaxed">
              Si ya la instalaste antes, abre Grimorio desde el ícono de tu
              pantalla de inicio; esta sesión seguirá disponible. También puedes
              instalarla más tarde desde Ajustes.
            </p>
          </div>
        </>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isSubmitting}
          className="gap-2 text-xs text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          <span>Anterior</span>
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row">
          {!isStandalone ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onContinueWithoutInstall}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Ahora no, continuar
            </Button>
          ) : null}

          <Button
            type="button"
            variant="primary"
            onClick={isStandalone ? onContinueWithoutInstall : onInstall}
            disabled={isSubmitting}
            className="w-full gap-2 sm:w-auto"
          >
            <Download className="size-4" aria-hidden="true" />
            <span>
              {isSubmitting
                ? "Preparando…"
                : isStandalone
                  ? "Continuar al resumen"
                  : "Instalar aplicación"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
