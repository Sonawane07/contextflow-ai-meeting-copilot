import "server-only";

import {
  fetchUpcomingEvents,
  isBriefableEvent,
  toMeetingDraft,
  type MeetingDraft,
} from "@/lib/integrations/google/calendar";
import {
  getValidAccessToken,
  recordSyncResult,
} from "@/lib/integrations/google/connection-store";
import { RepositoryError } from "@/lib/supabase/repositories";
import type { ContextFlowSupabaseClient } from "@/lib/supabase/server";
import type { CalendarSyncResult } from "@/types";

/** How far ahead to import. A fortnight covers "the meetings I can prepare for". */
export const SYNC_WINDOW_DAYS = 14;

export class CalendarSyncError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "CalendarSyncError";
  }
}

export function syncWindow(now: Date): { timeMin: Date; timeMax: Date } {
  const timeMax = new Date(now);
  timeMax.setUTCDate(timeMax.getUTCDate() + SYNC_WINDOW_DAYS);
  return { timeMin: now, timeMax };
}

/**
 * Imports upcoming calendar events as meetings.
 *
 * Idempotent: rows are upserted on `(user_id, source, external_ref)`, so
 * re-running updates a moved or renamed event rather than duplicating it. Only
 * `source = 'google_calendar'` rows are ever written, so the synthetic starter
 * workspace is untouched.
 *
 * Nothing here deletes. An event cancelled in Google stays as a meeting until
 * removed deliberately — deleting rows would silently take a brief and its
 * approved actions with it, and those record decisions a person made.
 */
export async function syncCalendar(
  client: ContextFlowSupabaseClient,
  userId: string,
  now = new Date(),
): Promise<CalendarSyncResult> {
  const accessToken = await getValidAccessToken(client, userId);
  if (!accessToken) {
    throw new CalendarSyncError("No Google Calendar connection to sync.");
  }

  const { timeMin, timeMax } = syncWindow(now);

  let drafts: MeetingDraft[];
  try {
    const events = await fetchUpcomingEvents(accessToken, { timeMin, timeMax });
    drafts = events.filter(isBriefableEvent).map(toMeetingDraft);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Calendar could not be read.";
    await recordSyncResult(client, userId, { syncedAt: now, error: message });
    throw new CalendarSyncError(message, error);
  }

  const skipped = 0;
  if (drafts.length === 0) {
    await recordSyncResult(client, userId, { syncedAt: now });
    return { imported: 0, updated: 0, skipped, syncedAt: now.toISOString() };
  }

  // Which of these events are already known, so the result can distinguish a
  // first import from a refresh.
  const externalIds = drafts.map((draft) => draft.externalId);
  const { data: existing, error: existingError } = await client
    .from("meetings")
    .select("external_ref")
    .eq("user_id", userId)
    .eq("source", "google_calendar")
    .in("external_ref", externalIds);

  if (existingError) {
    throw new RepositoryError("Existing meetings could not be read.", existingError);
  }
  const known = new Set((existing ?? []).map((row) => row.external_ref));

  const { error } = await client.from("meetings").upsert(
    drafts.map((draft) => ({
      user_id: userId,
      source: "google_calendar" as const,
      external_ref: draft.externalId,
      title: draft.title,
      summary: draft.summary,
      starts_at: draft.startsAt,
      ends_at: draft.endsAt,
      location: draft.location,
      attendees: draft.attendees,
      updated_at: now.toISOString(),
    })),
    { onConflict: "user_id,source,external_ref" },
  );

  if (error) {
    const message = "Synced meetings could not be saved.";
    await recordSyncResult(client, userId, { syncedAt: now, error: message });
    throw new RepositoryError(message, error);
  }

  const updated = drafts.filter((draft) => known.has(draft.externalId)).length;
  await recordSyncResult(client, userId, { syncedAt: now });

  return {
    imported: drafts.length - updated,
    updated,
    skipped,
    syncedAt: now.toISOString(),
  };
}
