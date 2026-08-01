import "server-only";

import type { ActionRepository } from "@/features/actions/repository";
import type { AuditRepository } from "@/features/actions/audit-repository";
import type { MeetingRepository } from "@/features/meetings/repository";
import type { ContextFlowSupabaseClient } from "@/lib/supabase/server";
import type { AttendeeJson } from "@/lib/supabase/database.types";
import type {
  ActionStatus,
  AuditLog,
  ContextItem,
  ExistingActionItem,
  FollowUpAction,
  Meeting,
  MeetingBrief,
  ProposedAction,
} from "@/types";

export class RepositoryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "RepositoryError";
  }
}

/**
 * Persistent repositories backed by Supabase/PostgreSQL.
 *
 * Reads rely on row-level security for tenant scoping; writes additionally set
 * `user_id` because the RLS `with check` clause requires it to match
 * `auth.uid()`. A mismatch fails in the database rather than silently writing
 * another tenant's row.
 */

const MEETING_SELECT = `
  id, title, summary, starts_at, ends_at, location, attendees,
  context_items ( source_key, kind, title, body, source_label, occurred_at ),
  meeting_action_items ( source_key, title, owner, completed ),
  meeting_briefs (
    id, objective, context_summary, unresolved_questions, suggested_agenda,
    provider, generated_at
  )
`;

interface MeetingJoinRow {
  id: string;
  title: string;
  summary: string;
  starts_at: string;
  ends_at: string;
  location: string;
  attendees: AttendeeJson[];
  context_items: {
    source_key: string;
    kind: ContextItem["type"];
    title: string;
    body: string;
    source_label: string;
    occurred_at: string;
  }[];
  meeting_action_items: {
    source_key: string;
    title: string;
    owner: string;
    completed: boolean;
  }[];
  meeting_briefs: {
    id: string;
    objective: string;
    context_summary: string;
    unresolved_questions: string[];
    suggested_agenda: string[];
    provider: MeetingBrief["provider"];
    generated_at: string;
  }[];
}

function toContextItem(
  row: MeetingJoinRow["context_items"][number],
): ContextItem {
  return {
    id: row.source_key,
    type: row.kind,
    title: row.title,
    body: row.body,
    sourceLabel: row.source_label,
    occurredAt: row.occurred_at,
  };
}

function toActionItem(
  row: MeetingJoinRow["meeting_action_items"][number],
): ExistingActionItem {
  return {
    id: row.source_key,
    title: row.title,
    owner: row.owner,
    completed: row.completed,
  };
}

function toMeeting(
  row: MeetingJoinRow,
  proposedActionsByBrief: Map<string, ProposedAction[]>,
): Meeting {
  const briefRow = row.meeting_briefs.at(0);
  const brief: MeetingBrief | undefined = briefRow
    ? {
        objective: briefRow.objective,
        contextSummary: briefRow.context_summary,
        unresolvedQuestions: briefRow.unresolved_questions,
        suggestedAgenda: briefRow.suggested_agenda,
        proposedActions: proposedActionsByBrief.get(briefRow.id) ?? [],
        generatedAt: briefRow.generated_at,
        provider: briefRow.provider,
      }
    : undefined;

  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    attendees: row.attendees,
    contextItems: [...row.context_items]
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .map(toContextItem),
    actionItems: row.meeting_action_items.map(toActionItem),
    brief,
  };
}

export class SupabaseMeetingRepository implements MeetingRepository {
  constructor(
    private readonly client: ContextFlowSupabaseClient,
    private readonly userId: string,
  ) {}

  private async loadProposedActions(
    briefIds: string[],
  ): Promise<Map<string, ProposedAction[]>> {
    const grouped = new Map<string, ProposedAction[]>();
    if (briefIds.length === 0) return grouped;

    const { data, error } = await this.client
      .from("proposed_actions")
      .select("meeting_brief_id, source_key, action_type, title, description")
      .in("meeting_brief_id", briefIds)
      .order("created_at", { ascending: true });

    if (error) {
      throw new RepositoryError("Proposed actions could not be read.", error);
    }

    for (const row of data ?? []) {
      if (!row.meeting_brief_id) continue;
      const existing = grouped.get(row.meeting_brief_id) ?? [];
      existing.push({
        id: row.source_key,
        type: row.action_type,
        title: row.title,
        description: row.description,
      });
      grouped.set(row.meeting_brief_id, existing);
    }
    return grouped;
  }

  private async hydrate(rows: MeetingJoinRow[]): Promise<Meeting[]> {
    const briefIds = rows.flatMap((row) =>
      row.meeting_briefs.map((brief) => brief.id),
    );
    const proposedActions = await this.loadProposedActions(briefIds);
    return rows.map((row) => toMeeting(row, proposedActions));
  }

  async list(): Promise<Meeting[]> {
    const { data, error } = await this.client
      .from("meetings")
      .select(MEETING_SELECT)
      .order("starts_at", { ascending: true })
      .overrideTypes<MeetingJoinRow[]>();

    if (error) {
      throw new RepositoryError("Meetings could not be read.", error);
    }
    return this.hydrate(data ?? []);
  }

  async findById(id: string): Promise<Meeting | null> {
    const { data, error } = await this.client
      .from("meetings")
      .select(MEETING_SELECT)
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<MeetingJoinRow>();

    if (error) {
      throw new RepositoryError("The meeting could not be read.", error);
    }
    if (!data) return null;
    const [meeting] = await this.hydrate([data]);
    return meeting ?? null;
  }

  async saveBrief(id: string, brief: MeetingBrief): Promise<Meeting | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const { error } = await this.client.from("meeting_briefs").upsert(
      {
        user_id: this.userId,
        meeting_id: id,
        objective: brief.objective,
        context_summary: brief.contextSummary,
        unresolved_questions: brief.unresolvedQuestions,
        suggested_agenda: brief.suggestedAgenda,
        provider: brief.provider,
        generated_at: brief.generatedAt,
      },
      { onConflict: "meeting_id" },
    );

    if (error) {
      throw new RepositoryError("The brief could not be saved.", error);
    }
    return this.findById(id);
  }
}

interface FollowUpJoinRow {
  source_key: string;
  action_type: FollowUpAction["type"];
  title: string;
  description: string;
  status: ActionStatus;
  created_at: string;
  decided_at: string | null;
  meeting_id: string;
  meetings: { title: string } | null;
}

const FOLLOW_UP_SELECT = `
  source_key, action_type, title, description, status, created_at, decided_at,
  meeting_id, meetings ( title )
`;

function toFollowUpAction(row: FollowUpJoinRow): FollowUpAction {
  return {
    id: row.source_key,
    type: row.action_type,
    title: row.title,
    description: row.description,
    meetingId: row.meeting_id,
    meetingTitle: row.meetings?.title ?? "Unknown meeting",
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at ?? undefined,
  };
}

export class SupabaseActionRepository implements ActionRepository {
  constructor(
    private readonly client: ContextFlowSupabaseClient,
    private readonly userId: string,
  ) {}

  async list(): Promise<FollowUpAction[]> {
    const { data, error } = await this.client
      .from("proposed_actions")
      .select(FOLLOW_UP_SELECT)
      .order("created_at", { ascending: false })
      .overrideTypes<FollowUpJoinRow[]>();

    if (error) {
      throw new RepositoryError("Actions could not be read.", error);
    }
    return (data ?? []).map(toFollowUpAction);
  }

  async findById(id: string): Promise<FollowUpAction | null> {
    const { data, error } = await this.client
      .from("proposed_actions")
      .select(FOLLOW_UP_SELECT)
      .eq("source_key", id)
      .maybeSingle()
      .overrideTypes<FollowUpJoinRow>();

    if (error) {
      throw new RepositoryError("The action could not be read.", error);
    }
    return data ? toFollowUpAction(data) : null;
  }

  /**
   * Records a decision only while the action is still pending.
   *
   * The `status` filter makes this a compare-and-set: two concurrent approvals
   * cannot both succeed, because the second update matches no row. The route
   * layer's pending check is a friendly error message, not the safety property.
   */
  async updateStatus(
    id: string,
    status: Exclude<ActionStatus, "pending">,
  ): Promise<FollowUpAction | null> {
    const { data, error } = await this.client
      .from("proposed_actions")
      .update({ status, decided_at: new Date().toISOString() })
      .eq("source_key", id)
      .eq("status", "pending")
      .select(FOLLOW_UP_SELECT)
      .maybeSingle()
      .overrideTypes<FollowUpJoinRow>();

    if (error) {
      throw new RepositoryError("The decision could not be saved.", error);
    }
    return data ? toFollowUpAction(data) : null;
  }

  /**
   * Re-syncs the proposals attached to a regenerated brief.
   *
   * Existing rows keep their status and decision timestamp: regenerating a
   * brief must never quietly reset a decision a human already made.
   */
  async upsertForMeeting(
    meetingId: string,
    _meetingTitle: string,
    proposedActions: ProposedAction[],
  ): Promise<FollowUpAction[]> {
    if (proposedActions.length === 0) return [];

    const { data: briefRow, error: briefError } = await this.client
      .from("meeting_briefs")
      .select("id")
      .eq("meeting_id", meetingId)
      .maybeSingle();

    if (briefError) {
      throw new RepositoryError(
        "The brief for these actions could not be read.",
        briefError,
      );
    }

    const { error } = await this.client.from("proposed_actions").upsert(
      proposedActions.map((proposed) => ({
        user_id: this.userId,
        meeting_id: meetingId,
        meeting_brief_id: briefRow?.id ?? null,
        source_key: proposed.id,
        action_type: proposed.type,
        title: proposed.title,
        description: proposed.description,
      })),
      { onConflict: "meeting_id,source_key", ignoreDuplicates: false },
    );

    if (error) {
      throw new RepositoryError("Proposed actions could not be saved.", error);
    }

    const keys = proposedActions.map((proposed) => proposed.id);
    const { data, error: readError } = await this.client
      .from("proposed_actions")
      .select(FOLLOW_UP_SELECT)
      .eq("meeting_id", meetingId)
      .in("source_key", keys)
      .order("created_at", { ascending: true })
      .overrideTypes<FollowUpJoinRow[]>();

    if (readError) {
      throw new RepositoryError(
        "Proposed actions could not be read back.",
        readError,
      );
    }
    return (data ?? []).map(toFollowUpAction);
  }
}

interface AuditJoinRow {
  id: string;
  proposed_action_id: string | null;
  action_title: string;
  status: Exclude<ActionStatus, "pending">;
  actor_label: string;
  created_at: string;
  meeting_id: string;
  meetings: { title: string } | null;
}

const AUDIT_SELECT = `
  id, proposed_action_id, action_title, status, actor_label, created_at,
  meeting_id, meetings ( title )
`;

export class SupabaseAuditRepository implements AuditRepository {
  constructor(
    private readonly client: ContextFlowSupabaseClient,
    private readonly userId: string,
  ) {}

  async list(): Promise<AuditLog[]> {
    const { data, error } = await this.client
      .from("audit_logs")
      .select(AUDIT_SELECT)
      .order("created_at", { ascending: false })
      .overrideTypes<AuditJoinRow[]>();

    if (error) {
      throw new RepositoryError("Audit logs could not be read.", error);
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      actionId: row.proposed_action_id ?? row.id,
      actionTitle: row.action_title,
      meetingId: row.meeting_id,
      meetingTitle: row.meetings?.title ?? "Unknown meeting",
      status: row.status,
      actor: row.actor_label,
      timestamp: row.created_at,
    }));
  }

  async recordDecision(
    action: FollowUpAction,
    actor: string,
  ): Promise<AuditLog> {
    if (action.status === "pending") {
      throw new RepositoryError("Cannot audit an action without a decision.");
    }

    const { data: actionRow, error: lookupError } = await this.client
      .from("proposed_actions")
      .select("id")
      .eq("meeting_id", action.meetingId)
      .eq("source_key", action.id)
      .maybeSingle();

    if (lookupError) {
      throw new RepositoryError(
        "The decided action could not be resolved.",
        lookupError,
      );
    }

    const { data, error } = await this.client
      .from("audit_logs")
      .insert({
        user_id: this.userId,
        meeting_id: action.meetingId,
        proposed_action_id: actionRow?.id ?? null,
        action_title: action.title,
        status: action.status,
        actor_label: actor,
        created_at: action.decidedAt ?? new Date().toISOString(),
      })
      .select("id, created_at")
      .single();

    if (error) {
      throw new RepositoryError("The decision could not be recorded.", error);
    }

    return {
      id: data.id,
      actionId: action.id,
      actionTitle: action.title,
      meetingId: action.meetingId,
      meetingTitle: action.meetingTitle,
      status: action.status,
      actor,
      timestamp: data.created_at,
    };
  }
}
