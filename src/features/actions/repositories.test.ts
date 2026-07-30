import { describe, expect, it } from "vitest";
import {
  DemoActionRepository,
  DemoAuditRepository,
} from "@/lib/demo/repositories";
import { createDemoStore } from "@/lib/demo/store";

describe("demo action decisions", () => {
  it.each(["approved", "rejected"] as const)(
    "moves a pending action to %s and records the decision",
    async (status) => {
      const store = createDemoStore();
      const actions = new DemoActionRepository(store);
      const audit = new DemoAuditRepository(store);

      const updated = await actions.updateStatus(
        "seed-action-pending",
        status,
      );
      expect(updated?.status).toBe(status);
      expect(updated?.decidedAt).toBeTruthy();

      const log = await audit.recordDecision(updated!, "Test User");
      expect(log.status).toBe(status);
      expect(log.actor).toBe("Test User");
      await expect(audit.list()).resolves.toContainEqual(log);
    },
  );
});
