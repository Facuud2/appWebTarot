import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceEnvironmentProvider } from "@/components/providers/device-environment-provider";
import { useMobileBackClose } from "@/hooks/use-mobile-back-close";

function TestOverlay({
  label,
  onClose,
}: {
  label: string;
  onClose: () => void;
}) {
  const [isOpen, setIsOpen] = React.useState(true);

  useMobileBackClose(isOpen, () => {
    setIsOpen(false);
    onClose();
  });

  return isOpen ? <div>{label}</div> : null;
}

describe("mobile overlay back handling", () => {
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

  it("closes only the topmost overlay when Back is pressed", async () => {
    const firstClose = vi.fn();
    const secondClose = vi.fn();
    function NestedOverlays() {
      const [showSecond, setShowSecond] = React.useState(false);
      return (
        <>
          <TestOverlay label="first" onClose={firstClose} />
          <button type="button" onClick={() => setShowSecond(true)}>
            Open second
          </button>
          {showSecond ? (
            <TestOverlay label="second" onClose={secondClose} />
          ) : null}
        </>
      );
    }

    render(
      <DeviceEnvironmentProvider>
        <NestedOverlays />
      </DeviceEnvironmentProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Open second" }));
    await waitFor(() =>
      expect(window.history.state.__grimorioMobileOverlay).toBeDefined()
    );

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(secondClose).toHaveBeenCalledOnce();
    expect(firstClose).not.toHaveBeenCalled();
    expect(screen.getByText("first")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(firstClose).toHaveBeenCalledOnce();
    expect(screen.queryByText("first")).not.toBeInTheDocument();
  });

  it("does not undo a route change when an overlay closes during navigation", async () => {
    const historyBack = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => {});
    const view = render(
      <DeviceEnvironmentProvider>
        <TestOverlay label="overlay" onClose={vi.fn()} />
      </DeviceEnvironmentProvider>
    );
    await waitFor(() =>
      expect(window.history.state.__grimorioMobileOverlay).toBeDefined()
    );
    const overlayEntryState = window.history.state;

    window.history.pushState({ routeChanged: true }, "", window.location.href);
    view.unmount();
    await new Promise((resolve) => window.setTimeout(resolve, 10));

    expect(historyBack).not.toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: overlayEntryState })
      );
    });
    expect(historyBack).toHaveBeenCalledOnce();
  });
});
