"use client";

import * as React from "react";
import { X, Download } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDeviceEnvironment } from "@/components/providers/device-environment-provider";
import { PwaInstallDialog } from "@/components/shared/pwa-install-dialog";

export type PwaPlatform =
  | "ios-safari"
  | "ios-chrome"
  | "ios-other"
  | "ipados-safari"
  | "ipados-chrome"
  | "ipados-other"
  | "android"
  | "other";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void> | void;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaInstallContextValue {
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafariIOS: boolean;
  isChromeIOS: boolean;
  platform: PwaPlatform;
  hasDeferredPrompt: boolean;
  install: () => Promise<void>;
}

const PwaInstallContext = React.createContext<PwaInstallContextValue | null>(
  null
);
const installPromptSubscribers = new Set<() => void>();
let deferredInstallPrompt: InstallPromptEvent | null = null;
let serviceWorkerRegistrationStarted = false;

function notifyInstallPromptSubscribers() {
  installPromptSubscribers.forEach((subscriber) => subscriber());
}

function handleBeforeInstallPrompt(event: Event) {
  event.preventDefault();
  const candidate = event as Partial<InstallPromptEvent>;
  if (typeof candidate.prompt !== "function") return;
  deferredInstallPrompt = candidate as InstallPromptEvent;
  notifyInstallPromptSubscribers();
}

function handleAppInstalled() {
  deferredInstallPrompt = null;
  notifyInstallPromptSubscribers();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
}

function getPwaPlatform(
  os: "ios" | "ipados" | "android" | "desktop",
  browser: "safari" | "chrome-ios" | "chrome-android" | "other"
): PwaPlatform {
  if (os === "android") return "android";
  if (os === "desktop") return "other";
  if (os === "ipados") {
    if (browser === "safari") return "ipados-safari";
    if (browser === "chrome-ios") return "ipados-chrome";
    return "ipados-other";
  }
  if (browser === "safari") return "ios-safari";
  if (browser === "chrome-ios") return "ios-chrome";
  return "ios-other";
}

export function usePwaInstall(): PwaInstallContextValue {
  const context = React.useContext(PwaInstallContext);
  if (!context) {
    throw new Error("usePwaInstall debe usarse dentro de PwaInstallProvider.");
  }
  return context;
}

export function PwaInstallProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile } = useDeviceEnvironment();
  const isStandalone = profile.isStandalone;
  const platform = getPwaPlatform(profile.os, profile.browser);
  const [hasDeferredPrompt, setHasDeferredPrompt] = React.useState(
    () => deferredInstallPrompt !== null
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [promptError, setPromptError] = React.useState<string | null>(null);
  const [bannerDismissedPath, setBannerDismissedPath] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    const updatePromptState = () =>
      setHasDeferredPrompt(deferredInstallPrompt !== null);
    installPromptSubscribers.add(updatePromptState);
    updatePromptState();
    return () => {
      installPromptSubscribers.delete(updatePromptState);
    };
  }, []);

  React.useEffect(() => {
    if (
      serviceWorkerRegistrationStarted ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }
    serviceWorkerRegistrationStarted = true;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error: unknown) => {
        console.error("No se pudo registrar el Service Worker de Grimorio.", error);
        serviceWorkerRegistrationStarted = false;
      });
  }, []);

  const isIOS = profile.os === "ios" || profile.os === "ipados";
  const isAndroid = platform === "android";
  const isSafariIOS = profile.browser === "safari" && isIOS;
  const isChromeIOS = profile.browser === "chrome-ios" && isIOS;

  const install = React.useCallback(async () => {
    if (isStandalone) return;

    const canUseNativePrompt =
      profile.os === "android" || profile.os === "desktop";
    const prompt = canUseNativePrompt ? deferredInstallPrompt : null;
    if (!prompt) {
      setPromptError(null);
      setDialogOpen(true);
      return;
    }

    deferredInstallPrompt = null;
    notifyInstallPromptSubscribers();
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") {
        setDialogOpen(false);
      }
    } catch (error) {
      console.error("No se pudo abrir el diálogo nativo de instalación.", error);
      setPromptError(
        "El navegador no pudo abrir el diálogo automático. Puedes instalarla desde el menú del navegador."
      );
      setDialogOpen(true);
    }
  }, [isStandalone, profile.os]);

  const contextValue = React.useMemo(
    () => ({
      isStandalone,
      isIOS,
      isAndroid,
      isSafariIOS,
      isChromeIOS,
      platform,
      hasDeferredPrompt,
      install,
    }),
    [
      hasDeferredPrompt,
      install,
      isAndroid,
      isChromeIOS,
      isIOS,
      isSafariIOS,
      isStandalone,
      platform,
    ]
  );

  const showInstallNotice =
    !isStandalone &&
    bannerDismissedPath !== pathname &&
    (pathname === "/" || pathname === "/acceso");

  return (
    <PwaInstallContext.Provider value={contextValue}>
      {children}
      <PwaInstallDialog
        open={dialogOpen && !isStandalone}
        onOpenChange={setDialogOpen}
        platform={platform}
        error={promptError}
      />
      {showInstallNotice ? (
        <aside
          aria-label="Instalación de Grimorio"
          className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-ground p-3 text-ink md:bottom-4"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
            <Download className="size-4" aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted">
            Guarda Grimorio en tu pantalla de inicio para abrir la mesa en modo pantalla completa.
          </p>
          <Button type="button" size="sm" onClick={() => void install()}>
            Instalar
          </Button>
          <button
            type="button"
            aria-label="Cerrar aviso de instalación"
            onClick={() => setBannerDismissedPath(pathname)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </aside>
      ) : null}
    </PwaInstallContext.Provider>
  );
}
