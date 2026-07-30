import { describe, expect, it } from "vitest";
import { meetingBriefOutputSchema } from "@/lib/validation/brief";

describe("meetingBriefOutputSchema", () => {
  it("accepts the structured brief contract", () => {
    const result = meetingBriefOutputSchema.safeParse({
      objective: "Align on the next experiment.",
      contextSummary: "The current flow has one clear point of friction.",
      unresolvedQuestions: ["Which segment should be first?"],
      suggestedAgenda: ["Review evidence", "Choose an owner"],
      proposedActions: [
        {
          id: "action-1",
          type: "create_task",
          title: "Write experiment brief",
          description: "Capture the hypothesis and success measure.",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported action types and empty required fields", () => {
    const result = meetingBriefOutputSchema.safeParse({
      objective: "",
      contextSummary: "Context",
      unresolvedQuestions: [],
      suggestedAgenda: [],
      proposedActions: [
        {
          id: "action-1",
          type: "send_without_approval",
          title: "Send it",
          description: "Unsafe",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
