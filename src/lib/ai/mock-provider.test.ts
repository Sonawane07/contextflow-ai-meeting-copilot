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

  // Regression: persisted meetings carry a database UUID rather than the demo
  // slug. Matching on id alone silently returned the same brief — and therefore
  // the same proposed-action keys — for every meeting in the workspace.
  it("resolves by title when the meeting carries a database id", async () => {
    const provider = new MockAIProvider();
    const briefs = await Promise.all(
      seedMeetings.map((meeting) =>
        provider.generateMeetingBrief({
          ...meeting,
          id: `11111111-2222-4333-8444-00000000000${seedMeetings.indexOf(meeting)}`,
        }),
      ),
    );

    const objectives = new Set(briefs.map((brief) => brief.objective));
    expect(objectives.size).toBe(seedMeetings.length);

    const actionIds = briefs.flatMap((brief) =>
      brief.proposedActions.map((action) => action.id),
    );
    expect(new Set(actionIds).size).toBe(actionIds.length);
  });

  it("falls back to a known brief for an unrecognised meeting", async () => {
    const provider = new MockAIProvider();
    const brief = await provider.generateMeetingBrief({
      ...seedMeetings[0]!,
      id: "99999999-2222-4333-8444-999999999999",
      title: "Some meeting the mock has never seen",
    });
    expect(brief.objective).toContain("activation experiment");
  });
});
