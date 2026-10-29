"use client";

import {
  ArrowDown,
  Check,
  MoreVertical,
  Share,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PwaPlatform } from "@/components/providers/pwa-install-provider";

interface PwaInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: PwaPlatform;
  error?: string | null;
}

interface InstallInstruction {
  icon: typeof Share;
  text: string;
}

function getInstructions(platform: PwaPlatform): InstallInstruction[] {
  if (platform === "ios-chrome" || platform === "ipados-chrome") {
    const isIPad = platform === "ipados-chrome";
    return [
      {
        icon: Share,
        text: isIPad
          ? "Toca Compartir (cuadrado con flecha hacia arriba) en la barra superior, junto a la barra de dirección."
          : "Toca Compartir (cuadrado con flecha hacia arriba) en la esquina superior derecha, junto a la barra de dirección.",
      },
      {
        icon: ArrowDown,
        text: "Desliza el menú hacia abajo y selecciona «Agregar a inicio» (+).",
      },
      {
        icon: Check,
        text: "Pulsa «Agregar» arriba a la derecha. Luego abre Grimorio desde el nuevo ícono para usarla sin las barras de Chrome.",
      },
    ];
  }

  if (platform === "ios-safari" || platform === "ipados-safari") {
    const isIPad = platform === "ipados-safari";
    return [
      {
        icon: Share,
        text: isIPad
          ? "Toca Compartir (cuadrado con flecha hacia arriba) en la barra superior derecha de Safari."
          : "Toca Compartir (cuadrado con flecha hacia arriba) en la barra inferior de Safari.",
      },
      {
        icon: ArrowDown,
        text: "Desliza las opciones y toca «Agregar a inicio» (+).",
      },
      {
        icon: Check,
        text: "Toca «Agregar» en la esquina superior derecha.",
      },
    ];
  }

  if (platform === "ios-other" || platform === "ipados-other") {
    return [
      {
        icon: Share,
        text: "Abre el menú Compartir del navegador y busca la opción para añadir Grimorio a la pantalla de inicio.",
      },
      {
        icon: ArrowDown,
        text: "Selecciona «Agregar a inicio».",
      },
      {
        icon: Check,
        text: "Confirma la instalación y abre Grimorio desde el nuevo ícono.",
      },
    ];
  }

  return [
    {
      icon: MoreVertical,
      text: "Toca el menú de tres puntos (⋮) en la esquina superior derecha de Chrome.",
    },
    {
      icon: ArrowDown,
      text: "Selecciona «Instalar aplicación» o «Agregar a la pantalla principal».",
    },
    {
      icon: Check,
      text: "Confirma pulsando «Instalar».",
    },
  ];
}

function getBrowserLabel(platform: PwaPlatform): string {
  if (platform === "ios-chrome") return "Chrome en iPhone";
  if (platform === "ipados-chrome") return "Chrome en iPad";
  if (platform === "ios-safari") return "Safari en iPhone";
  if (platform === "ipados-safari") return "Safari en iPad";
  if (platform === "ios-other") return "tu navegador en iPhone";
  if (platform === "ipados-other") return "tu navegador en iPad";
  if (platform === "android") return "Chrome en Android";
  return "tu navegador";
}

export function PwaInstallDialog({
  open,
  onOpenChange,
  platform,
  error,
}: PwaInstallDialogProps) {
  const instructions = getInstructions(platform);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.25rem)] max-w-md gap-4 p-4 sm:p-6">
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-full border border-border bg-surface text-accent">
            <Smartphone className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle>Instala Grimorio en {getBrowserLabel(platform)}</DialogTitle>
          <DialogDescription>
            Añade un acceso en la pantalla de inicio y abre la mesa a pantalla completa.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="rounded-lg border border-negative/30 bg-negative/5 p-3 text-sm text-negative">
            {error}
          </p>
        ) : null}

        <ol className="space-y-3">
          {instructions.map(({ icon: Icon, text }, index) => (
            <li
              key={text}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ground text-accent">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <p className="pt-1 text-sm leading-relaxed text-ink">
                <span className="mr-1 font-semibold text-accent">{index + 1}.</span>
                {text}
              </p>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
