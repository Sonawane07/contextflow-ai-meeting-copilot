import "server-only";

import { seedMeetings } from "@/lib/demo/seed";
import { RepositoryError } from "@/lib/supabase/repositories";
import type { ContextFlowSupabaseClient } from "@/lib/supabase/server";

/**
 * Gives a newly signed-up account the same synthetic workspace the demo uses.
 *
 * A brand-new authenticated account would otherwise land on an empty dashboard,
 * which makes the persistent path impossible to evaluate. The rows written here
 * are the same clearly-synthetic seed meetings, now owned by a real user and
 * subject to row-level security.
 *
 * This is idempotent: it exits early when the account already has meetings, so
 * repeated sign-ins never duplicate data. No brief or proposed action is
 * seeded — those are produced by generating a brief, which is the flow under
 * evaluation.
 */
export async function ensureWorkspaceSeeded(
  client: ContextFlowSupabaseClient,
  userId: string,
): Promise<void> {
  const { count, error: countError } = await client
    .from("meetings")
    .select("id", { count: "exact", head: true });

  if (countError) {
    throw new RepositoryError(
      "The workspace could not be inspected.",
      countError,
    );
  }
  if ((count ?? 0) > 0) return;

  const { data: insertedMeetings, error: meetingError } = await client
    .from("meetings")
    .insert(
      seedMeetings.map((meeting) => ({
        user_id: userId,
        external_ref: meeting.id,
        title: meeting.title,
        summary: meeting.summary,
        starts_at: meeting.startsAt,
        ends_at: meeting.endsAt,
        location: meeting.location,
        attendees: meeting.attendees,
      })),
    )
    .select("id, external_ref");

  if (meetingError) {
    throw new RepositoryError(
      "The starter workspace could not be created.",
      meetingError,
    );
  }

  const idByExternalRef = new Map(
    (insertedMeetings ?? []).map((row) => [row.external_ref, row.id]),
  );

  const contextRows = seedMeetings.flatMap((meeting) => {
    const meetingId = idByExternalRef.get(meeting.id);
    if (!meetingId) return [];
    return meeting.contextItems.map((item) => ({
      user_id: userId,
      meeting_id: meetingId,
      source_key: item.id,
      kind: item.type,
      title: item.title,
      body: item.body,
      source_label: item.sourceLabel,
      occurred_at: item.occurredAt,
    }));
  });

  if (contextRows.length > 0) {
    const { error } = await client.from("context_items").insert(contextRows);
    if (error) {
      throw new RepositoryError("Starter context could not be created.", error);
    }
  }

  const actionItemRows = seedMeetings.flatMap((meeting) => {
    const meetingId = idByExternalRef.get(meeting.id);
    if (!meetingId) return [];
    return meeting.actionItems.map((item) => ({
      user_id: userId,
      meeting_id: meetingId,
      source_key: item.id,
      title: item.title,
      owner: item.owner,
      completed: item.completed,
    }));
  });

  if (actionItemRows.length > 0) {
    const { error } = await client
      .from("meeting_action_items")
      .insert(actionItemRows);
    if (error) {
      throw new RepositoryError(
        "Starter action items could not be created.",
        error,
      );
    }
  }
}
