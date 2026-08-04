import { describe, expect, it } from "vitest";
import {
  buildJobInboxQuery,
  heuristicClassification,
  mergeClassifications,
} from "@/lib/integrations/google/job-inbox";
import type { EmailClassification } from "@/lib/validation/job-inbox";

function message(overrides: Partial<Parameters<typeof heuristicClassification>[0]> = {}) {
  return {
    id: "m1",
    subject: "",
    from: "someone@example.com",
    snippet: "",
    isUnread: false,
    ...overrides,
  };
}

describe("buildJobInboxQuery", () => {
  it("bounds the search and excludes chat, spam, and trash", () => {
    const q = buildJobInboxQuery();
    expect(q).toContain("newer_than:30d");
    expect(q).toContain("-in:chats");
    expect(q).toContain("-in:spam");
    expect(q).toContain("-in:trash");
  });

  it("covers the applicant tracking systems most companies send through", () => {
    const q = buildJobInboxQuery();
    for (const ats of ["greenhouse.io", "lever.co", "ashbyhq.com", "myworkday.com"]) {
      expect(q).toContain(`from:${ats}`);
    }
  });

  it("quotes multi-word subject terms so they match as phrases", () => {
    expect(buildJobInboxQuery()).toContain('subject:"next steps"');
  });
});

describe("heuristicClassification", () => {
  it("recognises a rejection and does not ask for a reply", () => {
    const c = heuristicClassification(
      message({ snippet: "Unfortunately we are not moving forward" }),
    );
    expect(c.category).toBe("rejection");
    expect(c.needsReply).toBe(false);
  });

  it("ranks a rejection above scheduling words in the same message", () => {
    // "We enjoyed the interview, but unfortunately..." is a rejection, not an
    // invitation. Order of checks is the behaviour under test.
    const c = heuristicClassification(
      message({
        subject: "Your interview with Acme",
        snippet: "Thanks for the interview. Unfortunately we are not moving forward.",
      }),
    );
    expect(c.category).toBe("rejection");
  });

  it("treats an offer as needing a reply", () => {
    const c = heuristicClassification(
      message({ snippet: "We are pleased to offer you the position" }),
    );
    expect(c.category).toBe("offer");
    expect(c.needsReply).toBe(true);
  });

  it("spots an assessment", () => {
    const c = heuristicClassification(
      message({ subject: "Take-home exercise" }),
    );
    expect(c.category).toBe("assessment");
    expect(c.needsReply).toBe(true);
  });

  it("spots scheduling as an interview invite", () => {
    const c = heuristicClassification(
      message({ snippet: "Here is my Calendly, please book a time" }),
    );
    expect(c.category).toBe("interview_invite");
    expect(c.needsReply).toBe(true);
  });

  it("treats an automated acknowledgement as needing nothing", () => {
    const c = heuristicClassification(
      message({ snippet: "We have received your application" }),
    );
    expect(c.category).toBe("acknowledgement");
    expect(c.needsReply).toBe(false);
  });

  it("falls back to unread as the signal when nothing else matches", () => {
    expect(heuristicClassification(message({ isUnread: true })).needsReply).toBe(true);
    expect(heuristicClassification(message({ isUnread: false })).needsReply).toBe(false);
  });

  it("always explains itself", () => {
    expect(heuristicClassification(message()).reason.length).toBeGreaterThan(0);
  });
});

describe("mergeClassifications", () => {
  const baseline: EmailClassification[] = [
    { messageId: "a", category: "other", needsReply: false, reason: "baseline a" },
    { messageId: "b", category: "other", needsReply: false, reason: "baseline b" },
  ];

  it("prefers the model's answer where it gave one", () => {
    const merged = mergeClassifications(baseline, [
      { messageId: "a", category: "offer", needsReply: true, reason: "model a" },
    ]);
    expect(merged[0]).toMatchObject({ category: "offer", reason: "model a" });
  });

  it("keeps the heuristic for anything the model omitted", () => {
    // A truncated or partial model response must not drop emails.
    const merged = mergeClassifications(baseline, [
      { messageId: "a", category: "offer", needsReply: true, reason: "model a" },
    ]);
    expect(merged[1]).toMatchObject({ reason: "baseline b" });
    expect(merged).toHaveLength(2);
  });

  it("ignores a classification for an id that was never sent", () => {
    const merged = mergeClassifications(baseline, [
      { messageId: "ghost", category: "offer", needsReply: true, reason: "hallucinated" },
    ]);
    expect(merged.map((m) => m.messageId)).toEqual(["a", "b"]);
    expect(merged.every((m) => m.reason.startsWith("baseline"))).toBe(true);
  });
});
