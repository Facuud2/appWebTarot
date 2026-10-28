import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PwaInstallProvider,
  usePwaInstall,
} from "@/components/providers/pwa-install-provider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/ajustes",
}));

function InstallControls() {
  const { isStandalone, platform, install } = usePwaInstall();
  return (
    <div>
      <p data-testid="platform">{platform}</p>
      <p data-testid="standalone">{String(isStandalone)}</p>
      <button type="button" onClick={() => void install()}>
        Instalar aplicación
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <PwaInstallProvider>
      <InstallControls />
    </PwaInstallProvider>
  );
}

function setUserAgent(userAgent: string, platform: string) {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: userAgent,
  });
  Object.defineProperty(navigator, "platform", {
    configurable: true,
    value: platform,
  });
}

describe("PWA installation provider", () => {
  beforeEach(() => {
    setUserAgent("Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0", "Linux x86_64");
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("shows Safari instructions when the browser has no native install prompt", async () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1",
      "iPhone"
    );
    const user = userEvent.setup();
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("platform")).toHaveTextContent("ios-safari")
    );
    await user.click(screen.getByRole("button", { name: "Instalar aplicación" }));

    expect(
      screen.getByRole("dialog", { name: /Instala Grimorio en Safari en iPhone/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/barra inferior de Safari/)).toBeInTheDocument();
    expect(screen.getByText(/Agregar a inicio/)).toBeInTheDocument();
  });

  it("shows Chrome for iOS instructions", async () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1",
      "iPhone"
    );
    const user = userEvent.setup();
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("platform")).toHaveTextContent("ios-chrome")
    );

    await user.click(screen.getByRole("button", { name: "Instalar aplicación" }));

    expect(screen.getByText(/esquina superior derecha/)).toBeInTheDocument();
    expect(screen.getByText(/Agregar a inicio/)).toBeInTheDocument();
  });

  it("captures and invokes the native Android install prompt", async () => {
    setUserAgent(
      "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
      "Linux armv8l"
    );
    const user = userEvent.setup();
    renderProvider();

    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = Object.assign(
      new Event("beforeinstallprompt", { cancelable: true }),
      {
        prompt,
        userChoice: Promise.resolve({
          outcome: "accepted" as const,
          platform: "web",
        }),
      }
    );
    const preventDefault = vi.spyOn(installEvent, "preventDefault");
    fireEvent(window, installEvent);
    expect(preventDefault).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.getByTestId("platform")).toHaveTextContent("android")
    );

    await user.click(screen.getByRole("button", { name: "Instalar aplicación" }));
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("detects installed standalone mode", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("standalone")).toHaveTextContent("true")
    );
  });
});
