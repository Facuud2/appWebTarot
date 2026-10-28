import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  formatDateShortEs,
  formatSessionDateTime,
  toIsoUtcString,
} from "@/lib/utils";

const originalTimezone = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "America/Argentina/Buenos_Aires";
});

afterAll(() => {
  if (originalTimezone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = originalTimezone;
  }
});

describe("session date-time normalization", () => {
  it("serializes a selected local time to UTC and displays the same local time", () => {
    const iso = toIsoUtcString(new Date(2026, 9, 28, 17, 0, 0));

    expect(iso).toBe("2026-10-28T20:00:00.000Z");
    expect(formatSessionDateTime(iso)).toBe("28 Oct 2026 · 17:00");
  });

  it("treats a timezone-free datetime-local value as browser-local time", () => {
    expect(toIsoUtcString("2026-10-28T17:00")).toBe(
      "2026-10-28T20:00:00.000Z"
    );
    expect(formatSessionDateTime("2026-10-28T20:00:00.000Z")).toBe(
      "28 Oct 2026 · 17:00"
    );
  });

  it("formats short dates in editorial Spanish", () => {
    expect(formatDateShortEs("2026-10-28")).toBe("28 oct 2026");
  });

  it("rejects malformed or impossible local date-times instead of persisting them", () => {
    expect(() => toIsoUtcString("not-a-date")).toThrow(RangeError);
    expect(() => toIsoUtcString("2026-02-31T17:00")).toThrow(RangeError);
  });
});
