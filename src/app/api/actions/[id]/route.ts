import { failure, success, unauthorized } from "@/lib/api-response";
import { getRequestContext } from "@/lib/request-context";
import { actionDecisionSchema } from "@/lib/validation/actions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, routeContext: RouteContext) {
  const context = await getRequestContext();
  if (!context) return unauthorized();

  const { id } = await routeContext.params;
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

  try {
    const existing = await context.actions.findById(id);
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

    // updateStatus only matches rows that are still pending, so a concurrent
    // decision loses here rather than overwriting the first one.
    const action = await context.actions.updateStatus(id, parsed.data.status);
    if (!action) {
      return failure(
        409,
        "ACTION_ALREADY_DECIDED",
        "This action already has a decision.",
      );
    }

    const auditLog = await context.audit.recordDecision(
      action,
      context.user.displayName,
    );
    return success({ action, auditLog }, { demoMode: context.demoMode });
  } catch {
    return failure(
      500,
      "ACTION_DECISION_FAILED",
      "The decision could not be saved.",
    );
  }
}
