import { describe, expect, it } from "vitest";
import { dailyBriefRequestedSchema } from "@/lib/validation/events";

const VALID = {
  userId: "6b1f1a1e-0000-4000-8000-000000000001",
  date: "2026-08-01",
};

describe("dailyBriefRequestedSchema", () => {
  it("accepts a well-formed payload", () => {
    expect(dailyBriefRequestedSchema.parse(VALID)).toEqual(VALID);
  });

  const invalidCases: { reason: string; payload: unknown }[] = [
    { reason: "a non-UUID user id", payload: { ...VALID, userId: "nope" } },
    { reason: "a non-ISO date", payload: { ...VALID, date: "01-08-2026" } },
    { reason: "a missing date", payload: { userId: VALID.userId } },
    { reason: "an empty payload", payload: {} },
    { reason: "a null payload", payload: null },
  ];

  it.each(invalidCases)("rejects $reason", ({ payload }) => {
    expect(dailyBriefRequestedSchema.safeParse(payload).success).toBe(false);
  });
});
