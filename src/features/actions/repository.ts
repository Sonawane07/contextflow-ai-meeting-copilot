import type { ActionStatus, FollowUpAction, ProposedAction } from "@/types";

export interface ActionRepository {
  list(): Promise<FollowUpAction[]>;
  findById(id: string): Promise<FollowUpAction | null>;
  updateStatus(
    id: string,
    status: Exclude<ActionStatus, "pending">,
  ): Promise<FollowUpAction | null>;
  upsertForMeeting(
    meetingId: string,
    meetingTitle: string,
    actions: ProposedAction[],
  ): Promise<FollowUpAction[]>;
}
