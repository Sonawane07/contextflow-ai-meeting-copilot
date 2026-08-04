import { GOOGLE_CALENDAR_EVENTS_ENDPOINT } from "@/lib/integrations/google/config";
import type { Attendee } from "@/types";

export class GoogleCalendarError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GoogleCalendarError";
  }
}

/** The subset of Google's event resource this app reads. */
export interface GoogleCalendarEvent {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: {
    email?: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
    resource?: boolean;
    responseStatus?: string;
  }[];
}

/** A calendar event mapped onto the app's own vocabulary, before persistence. */
export interface MeetingDraft {
  externalId: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  location: string;
  attendees: Attendee[];
}

function deriveInitials(name: string): string {
  const words = name
    .split(/[\s._@-]+/)
    .filter((word) => word.length > 0)
    .slice(0, 2);
  if (words.length === 0) return "??";
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function toAttendee(
  raw: NonNullable<GoogleCalendarEvent["attendees"]>[number],
): Attendee {
  const email = raw.email ?? "";
  const name = raw.displayName?.trim() || email.split("@")[0] || "Guest";
  const role = raw.self ? "You" : raw.organizer ? "Organizer" : "Attendee";
  return { name, email, role, initials: deriveInitials(name) };
}

/**
 * True for events this app treats as meetings.
 *
 * All-day entries are excluded on purpose: holidays, PTO, and reminders live
 * there, and briefing them adds noise rather than signal. Cancelled events and
 * events with no id or start time cannot be represented at all.
 */
export function isBriefableEvent(event: GoogleCalendarEvent): boolean {
  if (!event.id) return false;
  if (event.status === "cancelled") return false;
  if (!event.start?.dateTime || !event.end?.dateTime) return false;
  return true;
}

/**
 * Maps a Google event onto a meeting draft.
 *
 * Pure and exported so the mapping — the part with all the edge cases — is
 * testable without a network call or an OAuth token.
 */
export function toMeetingDraft(event: GoogleCalendarEvent): MeetingDraft {
  if (!isBriefableEvent(event)) {
    throw new GoogleCalendarError("Event cannot be represented as a meeting.");
  }

  const attendees = (event.attendees ?? [])
    // Meeting rooms and equipment come back as attendees; they are not people.
    .filter((raw) => !raw.resource)
    .map(toAttendee);

  return {
    externalId: event.id!,
    title: event.summary?.trim() || "(untitled event)",
    // Descriptions can be long and are frequently HTML; this is context for a
    // brief, not a document store.
    summary: (event.description ?? "").replace(/<[^>]*>/g, " ").trim().slice(0, 2000),
    startsAt: new Date(event.start!.dateTime!).toISOString(),
    endsAt: new Date(event.end!.dateTime!).toISOString(),
    location: event.location?.trim() || event.hangoutLink || "",
    attendees,
  };
}

/** Google's machine-readable reason code, when the body carries one. */
async function readErrorReason(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as {
      error?: { errors?: { reason?: string }[] };
    };
    return body.error?.errors?.[0]?.reason ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads upcoming events from the user's primary calendar.
 *
 * `singleEvents` expands recurring series into individual occurrences, which is
 * what "my meetings this week" means; without it a weekly standup arrives as
 * one recurrence rule that cannot be briefed.
 */
export async function fetchUpcomingEvents(
  accessToken: string,
  options: { timeMin: Date; timeMax: Date; maxResults?: number } ,
): Promise<GoogleCalendarEvent[]> {
  const url = new URL(GOOGLE_CALENDAR_EVENTS_ENDPOINT);
  url.searchParams.set("timeMin", options.timeMin.toISOString());
  url.searchParams.set("timeMax", options.timeMax.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", String(options.maxResults ?? 50));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    // Google returns a reason code alongside the status; a bare number sends
    // the reader looking in the wrong place. The two 403s below have entirely
    // different fixes.
    const reason = await readErrorReason(response);
    if (response.status === 403 && reason === "insufficientPermissions") {
      throw new GoogleCalendarError(
        "Calendar access was not granted. Reconnect and tick the calendar permission on Google's consent screen.",
        403,
      );
    }
    if (response.status === 403) {
      throw new GoogleCalendarError(
        "Google denied the calendar request. Check that the Google Calendar API is enabled for the project.",
        403,
      );
    }
    throw new GoogleCalendarError(
      `Google Calendar returned ${response.status}.`,
      response.status,
    );
  }

  const payload = (await response.json()) as { items?: GoogleCalendarEvent[] };
  return payload.items ?? [];
}
