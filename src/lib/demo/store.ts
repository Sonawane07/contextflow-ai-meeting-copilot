import { seedActions, seedAuditLogs, seedMeetings } from "@/lib/demo/seed";
import type { AuditLog, FollowUpAction, Meeting } from "@/types";

export interface DemoStore {
  meetings: Meeting[];
  actions: FollowUpAction[];
  auditLogs: AuditLog[];
}

export function createDemoStore(): DemoStore {
  return {
    meetings: structuredClone(seedMeetings),
    actions: structuredClone(seedActions),
    auditLogs: structuredClone(seedAuditLogs),
  };
}

const globalStore = globalThis as typeof globalThis & {
  contextFlowDemoStore?: DemoStore;
};

export const demoStore =
  globalStore.contextFlowDemoStore ?? createDemoStore();

if (process.env.NODE_ENV !== "production") {
  globalStore.contextFlowDemoStore = demoStore;
}
