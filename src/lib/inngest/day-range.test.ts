import { describe, expect, it } from "vitest";
import { isWithinRange, utcDayRange } from "@/lib/inngest/day-range";

describe("utcDayRange", () => {
  it("returns the UTC day containing the instant", () => {
    const range = utcDayRange(new Date("2026-08-01T13:45:12.000Z"));
    expect(range).toEqual({
      start: "2026-08-01T00:00:00.000Z",
      end: "2026-08-02T00:00:00.000Z",
      date: "2026-08-01",
    });
  });

  it("uses UTC rather than the host time zone", () => {
    // 23:30 UTC belongs to the 1st even where the host clock already reads
    // the 2nd. Deriving the range from local time would brief the wrong day.
    const range = utcDayRange(new Date("2026-08-01T23:30:00.000Z"));
    expect(range.date).toBe("2026-08-01");
  });

  it("rolls over month boundaries", () => {
    const range = utcDayRange(new Date("2026-08-31T09:00:00.000Z"));
    expect(range.end).toBe("2026-09-01T00:00:00.000Z");
  });
});

describe("isWithinRange", () => {
  const range = utcDayRange(new Date("2026-08-01T09:00:00.000Z"));

  it("includes a meeting starting exactly at the lower bound", () => {
    expect(isWithinRange("2026-08-01T00:00:00.000Z", range)).toBe(true);
  });

  it("excludes a meeting starting exactly at the upper bound", () => {
    // Half-open: midnight belongs to the next day's run, never to both.
    expect(isWithinRange("2026-08-02T00:00:00.000Z", range)).toBe(false);
  });

  it("excludes meetings outside the day", () => {
    expect(isWithinRange("2026-07-31T23:59:59.999Z", range)).toBe(false);
    expect(isWithinRange("2026-08-02T08:00:00.000Z", range)).toBe(false);
  });

  it("includes a meeting during the day", () => {
    expect(isWithinRange("2026-08-01T14:30:00.000Z", range)).toBe(true);
  });
});
