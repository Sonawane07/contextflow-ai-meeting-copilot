import { failure, success } from "@/lib/api-response";
import {
  actionRepository,
  auditRepository,
} from "@/lib/demo/repositories";
import { actionDecisionSchema } from "@/lib/validation/actions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload: unknown = await request.json().catch(() => null);
  const parsed = actionDecisionSchema.safeParse(payload);

  if (!parsed.success) {
    return failure(
      400,
      "INVALID_ACTION_DECISION",
      "Status must be approved or rejected.",
      parsed.error.flatten(),
    );
  }

  const existing = await actionRepository.findById(id);
  if (!existing) {
    return failure(404, "ACTION_NOT_FOUND", "Action not found.");
  }
  if (existing.status !== "pending") {
    return failure(
      409,
      "ACTION_ALREADY_DECIDED",
      "This action already has a decision.",
    );
  }

  const action = await actionRepository.updateStatus(id, parsed.data.status);
  if (!action) {
    return failure(404, "ACTION_NOT_FOUND", "Action not found.");
  }
  const auditLog = await auditRepository.recordDecision(action, "Demo User");
  return success({ action, auditLog }, {
    demoMode: process.env.DEMO_MODE !== "false",
  });
}
