import { describe, expect, it } from "vitest";
import {
  isBriefableEvent,
  toMeetingDraft,
  type GoogleCalendarEvent,
} from "@/lib/integrations/google/calendar";

function event(overrides: Partial<GoogleCalendarEvent> = {}): GoogleCalendarEvent {
  return {
    id: "evt-1",
    status: "confirmed",
    summary: "Launch readiness review",
    start: { dateTime: "2026-08-03T14:00:00-04:00" },
    end: { dateTime: "2026-08-03T15:00:00-04:00" },
    ...overrides,
  };
}

describe("isBriefableEvent", () => {
  it("accepts a normal timed event", () => {
    expect(isBriefableEvent(event())).toBe(true);
  });

  it("rejects cancelled events", () => {
    expect(isBriefableEvent(event({ status: "cancelled" }))).toBe(false);
  });

  it("rejects all-day entries", () => {
    // Holidays, PTO, and reminders live here; briefing them is noise.
    expect(
      isBriefableEvent(
        event({ start: { date: "2026-08-03" }, end: { date: "2026-08-04" } }),
      ),
    ).toBe(false);
  });

  it("rejects an event with no id, since sync could not key on it", () => {
    expect(isBriefableEvent(event({ id: undefined }))).toBe(false);
  });
});

describe("toMeetingDraft", () => {
  it("maps the core fields and normalises times to UTC", () => {
    const draft = toMeetingDraft(event());
    expect(draft).toMatchObject({
      externalId: "evt-1",
      title: "Launch readiness review",
      startsAt: "2026-08-03T18:00:00.000Z",
      endsAt: "2026-08-03T19:00:00.000Z",
    });
  });

  it("falls back to a placeholder title", () => {
    expect(toMeetingDraft(event({ summary: "   " })).title).toBe(
      "(untitled event)",
    );
  });

  it("prefers an explicit location, then the meet link", () => {
    expect(toMeetingDraft(event({ location: "Room 4" })).location).toBe("Room 4");
    expect(
      toMeetingDraft(event({ hangoutLink: "https://meet.google.com/abc" }))
        .location,
    ).toBe("https://meet.google.com/abc");
    expect(toMeetingDraft(event()).location).toBe("");
  });

  it("strips HTML out of the description", () => {
    // Calendar descriptions are frequently HTML; the brief prompt wants prose.
    const draft = toMeetingDraft(
      event({ description: "<p>Review the <b>checklist</b></p>" }),
    );
    expect(draft.summary).not.toContain("<");
    expect(draft.summary).toContain("checklist");
  });

  it("excludes meeting rooms from the attendee list", () => {
    const draft = toMeetingDraft(
      event({
        attendees: [
          { email: "maya@example.test", displayName: "Maya Chen", organizer: true },
          { email: "room-4@example.test", displayName: "Room 4", resource: true },
        ],
      }),
    );
    expect(draft.attendees).toHaveLength(1);
    expect(draft.attendees[0]).toMatchObject({
      name: "Maya Chen",
      role: "Organizer",
      initials: "MC",
    });
  });

  it("labels the connected user as themselves", () => {
    const draft = toMeetingDraft(
      event({ attendees: [{ email: "me@example.test", self: true }] }),
    );
    expect(draft.attendees[0]).toMatchObject({ role: "You", name: "me" });
  });

  it("throws rather than emitting an unusable draft", () => {
    expect(() => toMeetingDraft(event({ status: "cancelled" }))).toThrow();
  });
});
