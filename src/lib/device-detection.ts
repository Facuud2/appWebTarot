export type DeviceOS = "ios" | "ipados" | "android" | "desktop";
export type DeviceBrowser =
  | "safari"
  | "chrome-ios"
  | "chrome-android"
  | "other";

export interface DeviceProfile {
  os: DeviceOS;
  browser: DeviceBrowser;
  isTouch: boolean;
  isMobileOrTablet: boolean;
  isStandalone: boolean;
}

export interface DeviceDetectionInput {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  isStandalone: boolean;
}

export function detectDeviceProfile({
  userAgent,
  platform,
  maxTouchPoints,
  isStandalone,
}: DeviceDetectionInput): DeviceProfile {
  const isIPadOS =
    /iPad/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  const isIOS = /iPhone|iPod/i.test(userAgent) && !isIPadOS;
  const isAndroid = /Android/i.test(userAgent);
  const os: DeviceOS = isIPadOS
    ? "ipados"
    : isIOS
      ? "ios"
      : isAndroid
        ? "android"
        : "desktop";

  let browser: DeviceBrowser = "other";
  if ((isIOS || isIPadOS) && /CriOS/i.test(userAgent)) {
    browser = "chrome-ios";
  } else if (
    (isIOS || isIPadOS) &&
    !/CriOS|FxiOS|EdgiOS/i.test(userAgent) &&
    /Safari/i.test(userAgent)
  ) {
    browser = "safari";
  } else if (isAndroid && /Chrome/i.test(userAgent)) {
    browser = "chrome-android";
  }

  return {
    os,
    browser,
    isTouch:
      maxTouchPoints > 0 ||
      os === "ios" ||
      os === "ipados" ||
      (os === "android" && /Mobile/i.test(userAgent)) ||
      platform === "Android",
    isMobileOrTablet: os === "ios" || os === "ipados" || os === "android",
    isStandalone,
  };
}

export function getStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const legacyNavigator = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    legacyNavigator.standalone === true
  );
}

export function getCurrentDeviceProfile(): DeviceProfile {
  if (typeof navigator === "undefined") {
    return {
      os: "desktop",
      browser: "other",
      isTouch: false,
      isMobileOrTablet: false,
      isStandalone: false,
    };
  }

  return detectDeviceProfile({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    isStandalone: getStandaloneDisplayMode(),
  });
}
