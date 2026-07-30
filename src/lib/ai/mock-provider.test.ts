import { describe, expect, it } from "vitest";
import { MockAIProvider } from "@/lib/ai/mock-provider";
import { seedMeetings } from "@/lib/demo/seed";

describe("MockAIProvider", () => {
  it("returns the same realistic response for the same meeting", async () => {
    const provider = new MockAIProvider();
    const meeting = seedMeetings[0];
    expect(meeting).toBeDefined();

    const first = await provider.generateMeetingBrief(meeting!);
    const second = await provider.generateMeetingBrief(meeting!);

    expect(first).toEqual(second);
    expect(first.objective).toContain("activation experiment");
    expect(first.proposedActions).toHaveLength(2);
  });
});
