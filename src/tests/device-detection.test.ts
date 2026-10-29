import { describe, expect, it } from "vitest";
import { detectDeviceProfile } from "@/lib/device-detection";

const browser = {
  platform: "",
  maxTouchPoints: 0,
  isStandalone: false,
};

describe("device profile detection", () => {
  it("detects Safari on iPhone", () => {
    expect(
      detectDeviceProfile({
        ...browser,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
      })
    ).toEqual({
      os: "ios",
      browser: "safari",
      isTouch: true,
      isMobileOrTablet: true,
      isStandalone: false,
    });
  });

  it("recognizes iPadOS even when it reports a Macintosh user agent", () => {
    expect(
      detectDeviceProfile({
        ...browser,
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 5,
        isStandalone: true,
      })
    ).toMatchObject({
      os: "ipados",
      browser: "safari",
      isTouch: true,
      isMobileOrTablet: true,
      isStandalone: true,
    });
  });

  it("distinguishes Chrome on iOS from Safari", () => {
    expect(
      detectDeviceProfile({
        ...browser,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/130.0 Mobile/15E148 Safari/604.1",
        platform: "iPhone",
        maxTouchPoints: 5,
      }).browser
    ).toBe("chrome-ios");
  });

  it("detects Android Chrome and keeps desktop touch devices out of mobile OS classes", () => {
    const android = detectDeviceProfile({
      ...browser,
      userAgent:
        "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    });
    const desktop = detectDeviceProfile({
      ...browser,
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0",
      platform: "Linux x86_64",
      maxTouchPoints: 5,
    });

    expect(android).toMatchObject({
      os: "android",
      browser: "chrome-android",
      isTouch: true,
      isMobileOrTablet: true,
    });
    expect(desktop).toMatchObject({
      os: "desktop",
      browser: "other",
      isTouch: true,
      isMobileOrTablet: false,
    });
  });
});
