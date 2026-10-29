import * as React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceEnvironmentProvider } from "@/components/providers/device-environment-provider";
import { UnsavedChangesProvider, useUnsavedChanges } from "@/components/providers/unsaved-changes-provider";
import { useMobileBackClose } from "@/hooks/use-mobile-back-close";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  usePathname: () => "/lecturas/nueva",
}));

function DirtyScreen() {
  const { setIsDirty } = useUnsavedChanges();
  const [overlayOpen, setOverlayOpen] = React.useState(true);

  React.useEffect(() => {
    setIsDirty(true);
  }, [setIsDirty]);
  useMobileBackClose(overlayOpen, () => setOverlayOpen(false));

  return overlayOpen ? (
    <div role="dialog">
      Selector abierto
      <button type="button" onClick={() => setOverlayOpen(false)}>
        Cerrar selector
      </button>
    </div>
  ) : null;
}

describe("unsaved navigation and overlay back priority", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 15) Chrome/133.0 Mobile Safari/537.36",
    });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    window.history.replaceState({}, "", window.location.href);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("closes the overlay first and only prompts to leave on the next Back", async () => {
    render(
      <DeviceEnvironmentProvider>
        <UnsavedChangesProvider>
          <DirtyScreen />
        </UnsavedChangesProvider>
      </DeviceEnvironmentProvider>
    );

    await waitFor(() =>
      expect(window.history.state.__grimorioMobileOverlay).toBeDefined()
    );

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(screen.queryByText("Selector abierto")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("alertdialog", { name: /¿Deseas salir de la lectura/i })
    ).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(
      await screen.findByRole("alertdialog", {
        name: /¿Deseas salir de la lectura/i,
      })
    ).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(
      screen.queryByRole("alertdialog", {
        name: /¿Deseas salir de la lectura/i,
      })
    ).not.toBeInTheDocument();
  });

  it("does not interpret the history cleanup after a manual close as leaving", async () => {
    const historyBack = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => {
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

    render(
      <DeviceEnvironmentProvider>
        <UnsavedChangesProvider>
          <DirtyScreen />
        </UnsavedChangesProvider>
      </DeviceEnvironmentProvider>
    );
    await waitFor(() =>
      expect(window.history.state.__grimorioMobileOverlay).toBeDefined()
    );

    screen.getByRole("button", { name: "Cerrar selector" }).click();
    await waitFor(() => expect(historyBack).toHaveBeenCalledOnce());

    expect(
      screen.queryByRole("alertdialog", { name: /¿Deseas salir de la lectura/i })
    ).not.toBeInTheDocument();
  });
});
