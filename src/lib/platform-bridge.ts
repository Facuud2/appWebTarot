/**
 * Puente de plataforma: normaliza las diferencias entre Electron, la PWA
 * instalada y el navegador móvil/escritorio.
 *
 * Electron usa Chromium por debajo, pero sus binarios no incluyen las claves
 * privadas del servicio de voz de Google Chrome ni respetan el zoom del
 * navegador igual que una pestaña. Estas utilidades concentran esas
 * diferencias para que los componentes no las adivinen por su cuenta.
 */

export const SPREAD_ZOOM_EVENT = "grimorio:spread-zoom";

export interface SpreadZoomDetail {
  /** +1 acerca el tapete, -1 lo aleja. */
  direction: 1 | -1;
}

interface ElectronBridge {
  transcribeAudio?: (audio: Blob | ArrayBuffer) => Promise<string>;
}

interface ElectronWindow extends Window {
  electronAPI?: ElectronBridge;
  process?: { versions?: { electron?: string } };
}

function getBrowserWindow(): ElectronWindow | null {
  if (typeof window === "undefined") return null;
  return window as ElectronWindow;
}

/** Electron expone `process.versions.electron`, el UA o un preload propio. */
export function isElectronRuntime(): boolean {
  const win = getBrowserWindow();
  if (!win) return false;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return (
    /Electron/i.test(ua) ||
    Boolean(win.process?.versions?.electron) ||
    Boolean(win.electronAPI)
  );
}

/** PWA abierta en modo `standalone` (iOS, iPadOS, Android o escritorio). */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const legacyNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    legacyNavigator.standalone === true
  );
}

/** Contenedor de escritorio donde el zoom del sistema rompe la mesa. */
export function isDesktopAppRuntime(): boolean {
  return isElectronRuntime() || isStandalonePwa();
}

/** ¿Hay un motor de transcripción local conectado por el preload de Electron? */
export function hasLocalTranscriptionBridge(): boolean {
  const win = getBrowserWindow();
  return typeof win?.electronAPI?.transcribeAudio === "function";
}

/**
 * Motivo por el que el dictado nativo no puede funcionar en este contenedor.
 * `null` cuando el dictado está disponible o puede resolverse solo.
 */
export function getPlatformVoiceNotice(): string | null {
  if (!isElectronRuntime() || hasLocalTranscriptionBridge()) return null;
  return "El dictado en la nube no está disponible dentro de la app de escritorio. Escribe la nota o conecta un motor local de transcripción.";
}

function isSpreadCanvasTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("[data-spread-canvas]"));
}

function emitSpreadZoom(direction: 1 | -1) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SpreadZoomDetail>(SPREAD_ZOOM_EVENT, {
      detail: { direction },
    })
  );
}

function isZoomShortcut(event: KeyboardEvent): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return false;
  return (
    event.key === "+" ||
    event.key === "-" ||
    event.key === "=" ||
    event.key === "_" ||
    event.key === "0" ||
    event.code === "Equal" ||
    event.code === "Minus" ||
    event.code === "Digit0" ||
    event.code === "NumpadAdd" ||
    event.code === "NumpadSubtract" ||
    event.code === "Numpad0"
  );
}

/**
 * Intercepta los gestos de zoom del sistema.
 *
 * - Sobre el tapete (`[data-spread-canvas]`) siempre se cancela el zoom del
 *   navegador y se emite `grimorio:spread-zoom` para que `SpreadMap` ajuste su
 *   escala interna.
 * - En Electron o PWA instalada también se cancelan `Ctrl/Cmd + (+/-/0)` en el
 *   resto de la ventana para que la interfaz nunca se deforme.
 *
 * Devuelve una función de limpieza.
 */
export function installDesktopZoomShield(): () => void {
  if (typeof window === "undefined") return () => {};

  const handleWheel = (event: WheelEvent) => {
    if (!(event.ctrlKey || event.metaKey)) return;

    const overCanvas = isSpreadCanvasTarget(event.target);
    if (!overCanvas && !isDesktopAppRuntime()) return;

    event.preventDefault();
    event.stopPropagation();

    if (overCanvas) {
      emitSpreadZoom(event.deltaY < 0 ? 1 : -1);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isZoomShortcut(event)) return;

    const overCanvas = isSpreadCanvasTarget(event.target);
    if (!overCanvas && !isDesktopAppRuntime()) return;

    event.preventDefault();
    event.stopPropagation();

    if (!overCanvas) return;
    if (event.key === "0" || event.code === "Digit0" || event.code === "Numpad0") {
      return;
    }
    const zoomIn =
      event.key === "+" ||
      event.key === "=" ||
      event.code === "Equal" ||
      event.code === "NumpadAdd";
    emitSpreadZoom(zoomIn ? 1 : -1);
  };

  window.addEventListener("wheel", handleWheel, {
    capture: true,
    passive: false,
  });
  window.addEventListener("keydown", handleKeyDown, { capture: true });

  return () => {
    window.removeEventListener("wheel", handleWheel, { capture: true });
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
  };
}
