/**
 * Hand-authored database types for the schema in `supabase/migrations`.
 *
 * These are kept by hand rather than generated so the repository layer stays
 * readable in review and the file can be diffed against the migrations. Update
 * this file in the same change as any migration that alters a table.
 *
 * Every shape here is a `type` alias rather than an `interface` on purpose:
 * postgrest-js constrains rows to `Record<string, unknown>`, and only type
 * aliases receive an implicit index signature. Interfaces silently collapse the
 * whole client to `never`.
 */

export type ActionTypeColumn =
  | "draft_email"
  | "create_task"
  | "schedule_follow_up";
export type ActionStatusColumn = "pending" | "approved" | "rejected";
export type ContextKindColumn = "email" | "note" | "calendar";
export type ProviderColumn = "mock" | "anthropic";

export type AttendeeJson = {
  name: string;
  email: string;
  role: string;
  initials: string;
};

export type MeetingSourceColumn = "seed" | "google_calendar";

type MeetingRow = {
  id: string;
  user_id: string;
  external_ref: string | null;
  source: MeetingSourceColumn;
  title: string;
  summary: string;
  starts_at: string;
  ends_at: string;
  location: string;
  attendees: AttendeeJson[];
  created_at: string;
  updated_at: string;
};

export type TrackedEmailCategoryColumn =
  | "interview_invite"
  | "assessment"
  | "offer"
  | "rejection"
  | "reply_needed"
  | "acknowledgement"
  | "other";

type TrackedEmailRow = {
  id: string;
  user_id: string;
  message_id: string;
  thread_id: string;
  subject: string;
  from_label: string;
  snippet: string;
  received_at: string;
  is_unread: boolean;
  category: TrackedEmailCategoryColumn;
  needs_reply: boolean;
  reason: string;
  deadline_at: string | null;
  dismissed_at: string | null;
  first_seen_at: string;
  last_scanned_at: string;
};

type CalendarConnectionRow = {
  id: string;
  user_id: string;
  provider: "google";
  account_email: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  access_token_expires_at: string;
  scope: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
};

type ContextItemRow = {
  id: string;
  user_id: string;
  meeting_id: string;
  source_key: string;
  kind: ContextKindColumn;
  title: string;
  body: string;
  source_label: string;
  occurred_at: string;
  embedding: string | null;
  created_at: string;
};

type MeetingActionItemRow = {
  id: string;
  user_id: string;
  meeting_id: string;
  source_key: string;
  title: string;
  owner: string;
  completed: boolean;
  created_at: string;
};

type MeetingBriefRow = {
  id: string;
  user_id: string;
  meeting_id: string;
  objective: string;
  context_summary: string;
  unresolved_questions: string[];
  suggested_agenda: string[];
  provider: ProviderColumn;
  generated_at: string;
};

type ProposedActionRow = {
  id: string;
  user_id: string;
  meeting_id: string;
  meeting_brief_id: string | null;
  source_key: string;
  action_type: ActionTypeColumn;
  title: string;
  description: string;
  status: ActionStatusColumn;
  created_at: string;
  decided_at: string | null;
};

type AuditLogRow = {
  id: string;
  user_id: string;
  meeting_id: string;
  proposed_action_id: string | null;
  action_title: string;
  status: Exclude<ActionStatusColumn, "pending">;
  actor_label: string;
  created_at: string;
};

/** Columns the database defaults or generates are optional on insert. */
type Insert<Row, Required extends keyof Row> = {
  [K in Required]: Row[K];
} & {
  [K in Exclude<keyof Row, Required>]?: Row[K];
};

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Insert<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      meetings: Table<
        MeetingRow,
        "user_id" | "title" | "starts_at" | "ends_at"
      >;
      context_items: Table<
        ContextItemRow,
        | "user_id"
        | "meeting_id"
        | "source_key"
        | "kind"
        | "title"
        | "body"
        | "source_label"
        | "occurred_at"
      >;
      meeting_action_items: Table<
        MeetingActionItemRow,
        "user_id" | "meeting_id" | "source_key" | "title"
      >;
      meeting_briefs: Table<
        MeetingBriefRow,
        | "user_id"
        | "meeting_id"
        | "objective"
        | "context_summary"
        | "provider"
      >;
      proposed_actions: Table<
        ProposedActionRow,
        | "user_id"
        | "meeting_id"
        | "source_key"
        | "action_type"
        | "title"
        | "description"
      >;
      audit_logs: Table<
        AuditLogRow,
        "user_id" | "meeting_id" | "action_title" | "status" | "actor_label"
      >;
      tracked_emails: Table<
        TrackedEmailRow,
        "user_id" | "message_id" | "thread_id" | "received_at"
      >;
      calendar_connections: Table<
        CalendarConnectionRow,
        | "user_id"
        | "provider"
        | "account_email"
        | "access_token_encrypted"
        | "access_token_expires_at"
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
