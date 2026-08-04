import { describe, expect, it } from "vitest";
import {
  MAX_ATTENDEES_IN_QUERY,
  buildAttendeeQuery,
  toEmailContext,
} from "@/lib/integrations/google/gmail";
import type { Attendee } from "@/types";

function attendee(email: string, name = email.split("@")[0]!): Attendee {
  return { name, email, role: "Attendee", initials: "XX" };
}

const SELF = "me@example.com";

describe("buildAttendeeQuery", () => {
  it("searches both directions of correspondence with each attendee", () => {
    const q = buildAttendeeQuery([attendee("maya@example.com")], SELF)!;
    expect(q).toContain("from:maya@example.com");
    expect(q).toContain("to:maya@example.com");
  });

  it("excludes the connected user", () => {
    // Searching your own address matches your entire mailbox.
    const q = buildAttendeeQuery(
      [attendee(SELF), attendee("maya@example.com")],
      SELF,
    )!;
    expect(q).not.toContain(SELF);
    expect(q).toContain("maya@example.com");
  });

  it("matches the user case-insensitively", () => {
    const q = buildAttendeeQuery([attendee("ME@Example.com")], SELF);
    expect(q).toBeNull();
  });

  it("returns null when there is nobody else on the invite", () => {
    // A solo event has nothing to correlate against; a broader search would
    // pull in unrelated mail.
    expect(buildAttendeeQuery([], SELF)).toBeNull();
    expect(buildAttendeeQuery([attendee(SELF)], SELF)).toBeNull();
  });

  it("de-duplicates repeated addresses", () => {
    const q = buildAttendeeQuery(
      [attendee("maya@example.com"), attendee("maya@example.com")],
      SELF,
    )!;
    expect(q.match(/from:maya@example\.com/g)).toHaveLength(1);
  });

  it("caps the attendee fan-out so the query stays within Gmail's limits", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      attendee(`person${i}@example.com`),
    );
    const q = buildAttendeeQuery(many, SELF)!;
    expect(q.match(/from:/g)).toHaveLength(MAX_ATTENDEES_IN_QUERY);
  });

  it("bounds the search by age and excludes chat, spam, and trash", () => {
    const q = buildAttendeeQuery([attendee("maya@example.com")], SELF)!;
    expect(q).toContain("newer_than:14d");
    expect(q).toContain("-in:chats");
    expect(q).toContain("-in:spam");
    expect(q).toContain("-in:trash");
  });
});

describe("toEmailContext", () => {
  const message = {
    id: "msg-1",
    snippet: "Sharing the revised checklist before we meet",
    internalDate: "1785700000000",
    payload: {
      headers: [
        { name: "Subject", value: "Revised onboarding checklist" },
        { name: "From", value: "Maya Chen <maya@example.com>" },
        { name: "Date", value: "Sat, 2 Aug 2026 09:00:00 -0400" },
      ],
    },
  };

  it("maps a message onto the context vocabulary", () => {
    const draft = toEmailContext(message)!;
    expect(draft).toMatchObject({
      sourceKey: "msg-1",
      title: "Revised onboarding checklist",
      sourceLabel: "Email from Maya Chen <maya@example.com>",
    });
    expect(draft.body).toBe("Sharing the revised checklist before we meet");
  });

  it("dates from internalDate rather than the Date header", () => {
    // internalDate is epoch milliseconds set by Gmail; the Date header is
    // whatever the sending client wrote and is not reliably parseable.
    expect(toEmailContext(message)!.occurredAt).toBe(
      new Date(1785700000000).toISOString(),
    );
  });

  it("finds headers regardless of casing", () => {
    const draft = toEmailContext({
      id: "msg-2",
      payload: { headers: [{ name: "subject", value: "lowercase header" }] },
    })!;
    expect(draft.title).toBe("lowercase header");
  });

  it("un-escapes the HTML entities Gmail puts in snippets", () => {
    const draft = toEmailContext({
      id: "msg-3",
      snippet: "Ari&#39;s prototype &amp; the &quot;template&quot; question",
    })!;
    expect(draft.body).toBe(`Ari's prototype & the "template" question`);
  });

  it("falls back when a message has no subject", () => {
    expect(toEmailContext({ id: "msg-4" })!.title).toBe("(no subject)");
  });

  it("returns null for a message with no id, which could not be keyed", () => {
    expect(toEmailContext({ snippet: "orphan" })).toBeNull();
  });
});
