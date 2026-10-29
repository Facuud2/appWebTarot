import { expect, type Page } from "@playwright/test";

export type DeviceOS = "ios" | "ipados" | "android" | "desktop";
export type DeviceBrowser =
  | "safari"
  | "chrome-ios"
  | "chrome-android"
  | "other";

const PROJECT_OS: Record<string, DeviceOS> = {
  "desktop-chrome": "desktop",
  "desktop-safari": "desktop",
  "pixel-7": "android",
  "galaxy-s24": "android",
  "galaxy-a55": "android",
  "galaxy-tab-s9": "android",
  "iphone-se": "ios",
  "iphone-15": "ios",
  "iphone-16-pro-max": "ios",
  "iphone-chrome": "ios",
  "ipad-pro-11": "ipados",
  "ipad-mini": "ipados",
  "ipados-real-ua": "ipados",
};

const PROJECT_BROWSER: Record<string, DeviceBrowser> = {
  "desktop-chrome": "other",
  "desktop-safari": "other",
  "pixel-7": "chrome-android",
  "galaxy-s24": "chrome-android",
  "galaxy-a55": "chrome-android",
  "galaxy-tab-s9": "chrome-android",
  "iphone-se": "safari",
  "iphone-15": "safari",
  "iphone-16-pro-max": "safari",
  "iphone-chrome": "chrome-ios",
  "ipad-pro-11": "safari",
  "ipad-mini": "safari",
  "ipados-real-ua": "safari",
};

export function expectedOs(projectName: string): DeviceOS {
  return PROJECT_OS[projectName] ?? "desktop";
}

export function expectedBrowser(projectName: string): DeviceBrowser {
  return PROJECT_BROWSER[projectName] ?? "other";
}

export function isMobileProject(projectName: string): boolean {
  const os = expectedOs(projectName);
  return os === "ios" || os === "ipados" || os === "android";
}

/** `<html>` expone data-os/data-browser/data-standalone/data-keyboard. */
export async function readDocumentState(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const nav = document.querySelector<HTMLElement>(".app-bottom-nav");
    const header = document.querySelector<HTMLElement>(".app-top-header");
    const vv = window.visualViewport;

    return {
      os: root.dataset.os ?? null,
      browser: root.dataset.browser ?? null,
      standalone: root.dataset.standalone ?? null,
      keyboard: root.dataset.keyboard ?? null,
      vvh: root.style.getPropertyValue("--vvh").trim(),
      visualViewportHeight: vv?.height ?? null,
      innerHeight: window.innerHeight,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      nav: nav
        ? {
            opacity: getComputedStyle(nav).opacity,
            transform: getComputedStyle(nav).transform,
            paddingBottom: getComputedStyle(nav).paddingBottom,
          }
        : null,
      header: header
        ? { paddingTop: getComputedStyle(header).paddingTop }
        : null,
    };
  });
}

export async function expectOsAndBrowser(page: Page, projectName: string) {
  await expect(page.locator("html")).toHaveAttribute(
    "data-os",
    expectedOs(projectName)
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-browser",
    expectedBrowser(projectName)
  );
}

export async function expectNoHorizontalOverflow(
  page: Page,
  tolerance = 1
) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth
        ),
      { message: "La página no debe tener scroll horizontal" }
    )
    .toBeLessThanOrEqual(tolerance);
}

/**
 * Sustituye `visualViewport` por un objeto controlable para simular la
 * apertura del teclado virtual. Llamar a `setKeyboardOpen` después de cargar.
 * En WebKit/Chromium la propiedad original no se puede redefinir en la
 * instancia, así que se reemplaza el objeto completo (la app solo usa
 * `height` y los listeners de `resize`/`scroll`).
 */
export async function mockKeyboard(page: Page) {
  await page.addInitScript(() => {
    const globalWindow = window as unknown as {
      __setKeyboard?: (open: boolean) => void;
    };
    const target = new EventTarget();
    let height: number | null = null;

    Object.defineProperty(target, "height", {
      configurable: true,
      get: () => height ?? window.innerHeight,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      get: () => target,
    });

    globalWindow.__setKeyboard = (open: boolean) => {
      height = open ? Math.round(window.innerHeight * 0.55) : null;
      target.dispatchEvent(new Event("resize"));
    };
  });
}

export async function setKeyboardOpen(page: Page, open: boolean) {
  await page.evaluate((isOpen) => {
    (window as unknown as { __setKeyboard?: (v: boolean) => void }).__setKeyboard?.(
      isOpen
    );
  }, open);
}

/** Fuerza `display-mode: standalone` y `navigator.standalone`. */
export async function mockStandalone(page: Page) {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = ((query: string) => {
      if (query === "(display-mode: standalone)") {
        return {
          matches: true,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        } as unknown as MediaQueryList;
      }
      return original(query);
    }) as typeof window.matchMedia;

    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      get: () => true,
    });
  });
}

interface FakeRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

/** Instala un `SpeechRecognition` falso y helpers para emitir resultados. */
export async function mockSpeechRecognition(page: Page) {
  await page.addInitScript(() => {
    const state = {
      instances: [] as FakeRecognitionLike[],
      started: 0,
    };
    (window as unknown as { __speech: typeof state }).__speech = state;

    class FakeRecognition implements FakeRecognitionLike {
      lang = "";
      continuous = false;
      interimResults = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;

      constructor() {
        state.instances.push(this);
      }

      start() {
        state.started += 1;
      }

      stop() {
        this.onend?.();
      }

      abort() {
        this.onend?.();
      }
    }

    (window as unknown as Record<string, unknown>).SpeechRecognition =
      FakeRecognition;
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition =
      FakeRecognition;
  });
}

export async function emitSpeech(
  page: Page,
  text: string,
  isFinal = true
) {
  await page.evaluate(
    ({ transcript, final }) => {
      const state = (
        window as unknown as {
          __speech: { instances: Array<Record<string, unknown>> };
        }
      ).__speech;
      const recognition = state.instances.at(-1) as {
        onresult?: (event: unknown) => void;
      };
      if (!recognition?.onresult) {
        throw new Error("No hay reconocimiento activo");
      }
      recognition.onresult({
        resultIndex: 0,
        results: [
          {
            0: { transcript },
            isFinal: final,
            length: 1,
          },
        ],
      });
    },
    { transcript: text, final: isFinal }
  );
}

export async function emitSpeechError(page: Page, error: string) {
  await page.evaluate((errorCode) => {
    const state = (
      window as unknown as {
        __speech: { instances: Array<Record<string, unknown>> };
      }
    ).__speech;
    const recognition = state.instances.at(-1) as {
      onerror?: (event: { error: string }) => void;
      onend?: () => void;
    };
    if (!recognition?.onerror) {
      throw new Error("No hay reconocimiento activo");
    }
    recognition.onerror({ error: errorCode });
    recognition.onend?.();
  }, error);
}

export async function getLastRecognition(page: Page) {
  return page.evaluate(() => {
    const state = (
      window as unknown as {
        __speech?: {
          instances: Array<{ continuous: boolean; lang: string }>;
          started: number;
        };
      }
    ).__speech;
    const recognition = state?.instances.at(-1) ?? null;
    return recognition
      ? {
          continuous: recognition.continuous,
          lang: recognition.lang,
          started: state?.started ?? 0,
        }
      : null;
  });
}

/** Simula el evento `beforeinstallprompt` de Chrome Android. */
export async function mockInstallPrompt(page: Page) {
  await page.addInitScript(() => {
    const state = { supported: false, promptCalled: false };
    (window as unknown as { __install: typeof state }).__install = state;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.supported = true;
    });
  });
}

export async function triggerInstallPrompt(page: Page) {
  await page.evaluate(() => {
    const state = (window as unknown as { __install: { promptCalled: boolean } })
      .__install;
    const event = new Event("beforeinstallprompt") as Event & {
      prompt?: () => Promise<void>;
      userChoice?: Promise<{ outcome: string }>;
    };
    event.prompt = async () => {
      state.promptCalled = true;
    };
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);
  });
}

export async function wasInstallPromptCalled(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { __install?: { promptCalled: boolean } }).__install
        ?.promptCalled ?? false
  );
}
