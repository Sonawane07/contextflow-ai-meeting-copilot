import type { ActionRepository } from "@/features/actions/repository";
import type { AuditRepository } from "@/features/actions/audit-repository";
import type { MeetingRepository } from "@/features/meetings/repository";
import { demoStore, type DemoStore } from "@/lib/demo/store";
import type {
  ActionStatus,
  AuditLog,
  FollowUpAction,
  Meeting,
  MeetingBrief,
  ProposedAction,
} from "@/types";

export class DemoMeetingRepository implements MeetingRepository {
  constructor(private readonly store: DemoStore = demoStore) {}

  async list(): Promise<Meeting[]> {
    return structuredClone(this.store.meetings);
  }

  async findById(id: string): Promise<Meeting | null> {
    const meeting = this.store.meetings.find((item) => item.id === id);
    return meeting ? structuredClone(meeting) : null;
  }

  async saveBrief(
    id: string,
    brief: MeetingBrief,
  ): Promise<Meeting | null> {
    const meeting = this.store.meetings.find((item) => item.id === id);
    if (!meeting) return null;
    meeting.brief = structuredClone(brief);
    return structuredClone(meeting);
  }
}

export class DemoActionRepository implements ActionRepository {
  constructor(private readonly store: DemoStore = demoStore) {}

  async list(): Promise<FollowUpAction[]> {
    return structuredClone(
      [...this.store.actions].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    );
  }

  async findById(id: string): Promise<FollowUpAction | null> {
    const action = this.store.actions.find((item) => item.id === id);
    return action ? structuredClone(action) : null;
  }

  async updateStatus(
    id: string,
    status: Exclude<ActionStatus, "pending">,
  ): Promise<FollowUpAction | null> {
    const action = this.store.actions.find((item) => item.id === id);
    if (!action) return null;
    action.status = status;
    action.decidedAt = new Date().toISOString();
    return structuredClone(action);
  }

  async upsertForMeeting(
    meetingId: string,
    meetingTitle: string,
    proposedActions: ProposedAction[],
  ): Promise<FollowUpAction[]> {
    const createdAt = new Date().toISOString();
    const upserted = proposedActions.map((proposed) => {
      const existing = this.store.actions.find(
        (action) => action.id === proposed.id,
      );
      const next: FollowUpAction = {
        ...proposed,
        meetingId,
        meetingTitle,
        status: existing?.status ?? "pending",
        createdAt: existing?.createdAt ?? createdAt,
        decidedAt: existing?.decidedAt,
      };
      if (existing) {
        Object.assign(existing, next);
      } else {
        this.store.actions.push(next);
      }
      return structuredClone(next);
    });
    return upserted;
  }
}

export class DemoAuditRepository implements AuditRepository {
  constructor(private readonly store: DemoStore = demoStore) {}

  async list(): Promise<AuditLog[]> {
    return structuredClone(
      [...this.store.auditLogs].sort((a, b) =>
        b.timestamp.localeCompare(a.timestamp),
      ),
    );
  }

  async recordDecision(
    action: FollowUpAction,
    actor: string,
  ): Promise<AuditLog> {
    if (action.status === "pending") {
      throw new Error("Cannot audit an action without a decision.");
    }
    const log: AuditLog = {
      id: `audit-${action.id}-${Date.now()}`,
      actionId: action.id,
      actionTitle: action.title,
      meetingId: action.meetingId,
      meetingTitle: action.meetingTitle,
      status: action.status,
      actor,
      timestamp: action.decidedAt ?? new Date().toISOString(),
    };
    this.store.auditLogs.push(log);
    return structuredClone(log);
  }
}

export const meetingRepository = new DemoMeetingRepository();
export const actionRepository = new DemoActionRepository();
export const auditRepository = new DemoAuditRepository();
