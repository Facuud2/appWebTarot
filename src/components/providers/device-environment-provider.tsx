"use client";

import * as React from "react";
import {
  getCurrentDeviceProfile,
  type DeviceProfile,
} from "@/lib/device-detection";

interface DeviceEnvironmentValue {
  profile: DeviceProfile;
  keyboardOpen: boolean;
  isTabletViewport: boolean;
}

const DESKTOP_PROFILE: DeviceProfile = {
  os: "desktop",
  browser: "other",
  isTouch: false,
  isMobileOrTablet: false,
  isStandalone: false,
};

const DEFAULT_ENVIRONMENT: DeviceEnvironmentValue = {
  profile: DESKTOP_PROFILE,
  keyboardOpen: false,
  isTabletViewport: false,
};

const DeviceEnvironmentContext =
  React.createContext<DeviceEnvironmentValue>(DEFAULT_ENVIRONMENT);

function getVisibleViewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}

export function DeviceEnvironmentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [environment, setEnvironment] =
    React.useState<DeviceEnvironmentValue>(DEFAULT_ENVIRONMENT);

  React.useEffect(() => {
    const displayMode = window.matchMedia?.("(display-mode: standalone)");

    const updateEnvironment = () => {
      const profile = getCurrentDeviceProfile();
      const visibleHeight = getVisibleViewportHeight();
      const activeTag = document.activeElement?.tagName;
      const keyboardOpen =
        profile.isTouch &&
        (window.innerHeight - visibleHeight > 140 ||
          activeTag === "INPUT" ||
          activeTag === "TEXTAREA");

      document.documentElement.style.setProperty(
        "--vvh",
        `${visibleHeight}px`
      );
      document.documentElement.dataset.os = profile.os;
      document.documentElement.dataset.browser = profile.browser;
      document.documentElement.dataset.standalone = String(
        profile.isStandalone
      );
      document.documentElement.dataset.keyboard = keyboardOpen
        ? "open"
        : "closed";

      const nextEnvironment = {
        profile,
        keyboardOpen,
        isTabletViewport:
          window.matchMedia?.(
            "(min-width: 768px) and (max-width: 1023px)"
          ).matches ?? false,
      };
      setEnvironment((previous) => {
        if (
          previous.profile.os === profile.os &&
          previous.profile.browser === profile.browser &&
          previous.profile.isTouch === profile.isTouch &&
          previous.profile.isMobileOrTablet === profile.isMobileOrTablet &&
          previous.profile.isStandalone === profile.isStandalone &&
          previous.keyboardOpen === keyboardOpen &&
          previous.isTabletViewport === nextEnvironment.isTabletViewport
        ) {
          return previous;
        }
        return nextEnvironment;
      });
    };
    const handleFocusOut = () => {
      window.requestAnimationFrame(updateEnvironment);
    };

    const visualViewport = window.visualViewport;
    document.addEventListener("focusin", updateEnvironment);
    document.addEventListener("focusout", handleFocusOut);
    window.addEventListener("resize", updateEnvironment);
    window.addEventListener("pageshow", updateEnvironment);
    visualViewport?.addEventListener("resize", updateEnvironment);
    visualViewport?.addEventListener("scroll", updateEnvironment);
    displayMode?.addEventListener("change", updateEnvironment);
    updateEnvironment();

    return () => {
      document.removeEventListener("focusin", updateEnvironment);
      document.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("resize", updateEnvironment);
      window.removeEventListener("pageshow", updateEnvironment);
      visualViewport?.removeEventListener("resize", updateEnvironment);
      visualViewport?.removeEventListener("scroll", updateEnvironment);
      displayMode?.removeEventListener("change", updateEnvironment);
    };
  }, []);

  return (
    <DeviceEnvironmentContext.Provider value={environment}>
      {children}
    </DeviceEnvironmentContext.Provider>
  );
}

export function useDeviceEnvironment(): DeviceEnvironmentValue {
  return React.useContext(DeviceEnvironmentContext);
}
