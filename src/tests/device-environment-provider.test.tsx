import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DeviceEnvironmentProvider,
  useDeviceEnvironment,
} from "@/components/providers/device-environment-provider";

function ProfileOutput() {
  const { profile, keyboardOpen } = useDeviceEnvironment();
  return (
    <output>
      {profile.os}|{profile.browser}|{String(profile.isStandalone)}|
      {String(keyboardOpen)}
    </output>
  );
}

describe("device environment provider", () => {
  let originalUserAgent: PropertyDescriptor | undefined;
  let originalPlatform: PropertyDescriptor | undefined;
  let originalTouchPoints: PropertyDescriptor | undefined;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalUserAgent = Object.getOwnPropertyDescriptor(navigator, "userAgent");
    originalPlatform = Object.getOwnPropertyDescriptor(navigator, "platform");
    originalTouchPoints = Object.getOwnPropertyDescriptor(
      navigator,
      "maxTouchPoints"
    );
    originalMatchMedia = window.matchMedia;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36",
    });
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      value: "Linux armv8l",
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: 5,
    });
    window.matchMedia = (query: string) =>
      ({
        matches: query === "(display-mode: standalone)",
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  });

  afterEach(() => {
    if (originalUserAgent) {
      Object.defineProperty(navigator, "userAgent", originalUserAgent);
    }
    if (originalPlatform) {
      Object.defineProperty(navigator, "platform", originalPlatform);
    }
    if (originalTouchPoints) {
      Object.defineProperty(navigator, "maxTouchPoints", originalTouchPoints);
    }
    window.matchMedia = originalMatchMedia;
    delete document.documentElement.dataset.os;
    delete document.documentElement.dataset.standalone;
    delete document.documentElement.dataset.keyboard;
    document.documentElement.style.removeProperty("--vvh");
  });

  it("publishes the shared profile, display mode, and visible viewport on html", async () => {
    render(
      <DeviceEnvironmentProvider>
        <ProfileOutput />
      </DeviceEnvironmentProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.os).toBe("android");
      expect(document.documentElement.dataset.standalone).toBe("true");
      expect(document.documentElement.style.getPropertyValue("--vvh")).toBe(
        `${window.innerHeight}px`
      );
    });
    expect(screen.getByText("android|chrome-android|true|false")).toBeVisible();
  });

  it("marks a focused text field as keyboard-open on touch devices", async () => {
    render(
      <DeviceEnvironmentProvider>
        <ProfileOutput />
        <textarea aria-label="Notas" />
      </DeviceEnvironmentProvider>
    );

    screen.getByRole("textbox", { name: "Notas" }).focus();
    await waitFor(() => {
      expect(document.documentElement.dataset.keyboard).toBe("open");
      expect(screen.getByText("android|chrome-android|true|true")).toBeVisible();
    });
  });
});
