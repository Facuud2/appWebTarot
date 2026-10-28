"use client";

import * as React from "react";
import { X, Download } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PwaInstallDialog } from "@/components/shared/pwa-install-dialog";

export type PwaPlatform =
  | "ios-safari"
  | "ios-chrome"
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

function detectStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function detectPlatform(userAgent: string, platform: string): PwaPlatform {
  const isIOS =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) {
    return /CriOS/i.test(userAgent) ? "ios-chrome" : "ios-safari";
  }
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}

function subscribeToPlatformChange(callback: () => void): () => void {
  window.addEventListener("pageshow", callback);
  return () => window.removeEventListener("pageshow", callback);
}

function getPlatformSnapshot(): PwaPlatform {
  return detectPlatform(navigator.userAgent, navigator.platform);
}

function getServerPlatformSnapshot(): PwaPlatform {
  return "other";
}

function subscribeToStandaloneChange(callback: () => void): () => void {
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => {
    displayMode.removeEventListener("change", callback);
    window.removeEventListener("appinstalled", callback);
  };
}

function getStandaloneSnapshot(): boolean {
  return detectStandalone();
}

function getServerStandaloneSnapshot(): boolean {
  return false;
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
  const isStandalone = React.useSyncExternalStore(
    subscribeToStandaloneChange,
    getStandaloneSnapshot,
    getServerStandaloneSnapshot
  );
  const platform = React.useSyncExternalStore(
    subscribeToPlatformChange,
    getPlatformSnapshot,
    getServerPlatformSnapshot
  );
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

  const isIOS = platform === "ios-safari" || platform === "ios-chrome";
  const isAndroid = platform === "android";
  const isSafariIOS = platform === "ios-safari";
  const isChromeIOS = platform === "ios-chrome";

  const install = React.useCallback(async () => {
    if (isStandalone) return;

    const prompt = deferredInstallPrompt;
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
  }, [isStandalone]);

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
        open={dialogOpen}
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
