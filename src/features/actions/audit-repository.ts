import type { AuditLog, FollowUpAction } from "@/types";

export interface AuditRepository {
  list(): Promise<AuditLog[]>;
  recordDecision(
    action: FollowUpAction,
    actor: string,
  ): Promise<AuditLog>;
}
