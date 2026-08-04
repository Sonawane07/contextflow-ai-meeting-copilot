export type ContextItemType = "email" | "note" | "calendar";
export type ActionType = "draft_email" | "create_task" | "schedule_follow_up";
export type ActionStatus = "pending" | "approved" | "rejected";

export interface Attendee {
  name: string;
  email: string;
  role: string;
  initials: string;
}

export interface ContextItem {
  id: string;
  type: ContextItemType;
  title: string;
  body: string;
  sourceLabel: string;
  occurredAt: string;
}

export interface ExistingActionItem {
  id: string;
  title: string;
  owner: string;
  completed: boolean;
}

export interface ProposedAction {
  id: string;
  type: ActionType;
  title: string;
  description: string;
}

export interface MeetingBrief {
  objective: string;
  contextSummary: string;
  unresolvedQuestions: string[];
  suggestedAgenda: string[];
  proposedActions: ProposedAction[];
  generatedAt: string;
  provider: "mock" | "anthropic";
}

export interface Meeting {
  id: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  location: string;
  attendees: Attendee[];
  contextItems: ContextItem[];
  actionItems: ExistingActionItem[];
  brief?: MeetingBrief;
}

export interface FollowUpAction extends ProposedAction {
  meetingId: string;
  meetingTitle: string;
  status: ActionStatus;
  createdAt: string;
  decidedAt?: string;
}

export interface AuditLog {
  id: string;
  actionId: string;
  actionTitle: string;
  meetingId: string;
  meetingTitle: string;
  status: Exclude<ActionStatus, "pending">;
  actor: string;
  timestamp: string;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  initials: string;
  /** True when the request is served by the credential-free demo path. */
  isDemo: boolean;
}

/** A calendar connection as the UI sees it — never carries a token. */
export interface CalendarConnectionSummary {
  provider: "google";
  accountEmail: string;
  /** When the current access token expires; it is refreshed automatically. */
  expiresAt: string;
  lastSyncedAt?: string;
  lastSyncError?: string;
  scope: string;
  /** True when gmail.readonly was granted, so briefs get email context. */
  gmailEnabled: boolean;
}

export interface CalendarSyncResult {
  imported: number;
  updated: number;
  skipped: number;
  /** Email context items attached; 0 when the Gmail scope was not granted. */
  emailsLinked: number;
  syncedAt: string;
}

export type TrackedEmailCategory =
  | "interview_invite"
  | "assessment"
  | "offer"
  | "rejection"
  | "reply_needed"
  | "acknowledgement"
  | "other";

/** A job-search email still awaiting the user. Read-only against Gmail. */
export interface TrackedEmail {
  id: string;
  messageId: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
  receivedAt: string;
  isUnread: boolean;
  category: TrackedEmailCategory;
  needsReply: boolean;
  reason: string;
  deadlineAt?: string;
  dismissedAt?: string;
}

export interface JobInboxScanSummary {
  scanned: number;
  tracked: number;
  needingReply: number;
  scannedAt: string;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: {
    demoMode: boolean;
    provider?: "mock" | "anthropic";
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
