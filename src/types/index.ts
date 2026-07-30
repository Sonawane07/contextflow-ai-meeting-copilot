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
