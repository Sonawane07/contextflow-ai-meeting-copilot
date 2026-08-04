import { failure, success, unauthorized } from "@/lib/api-response";
import { getRequestContext } from "@/lib/request-context";

export async function GET() {
  const context = await getRequestContext();
  if (!context) return unauthorized();

  try {
    const actions = await context.actions.list();
    return success(actions, { demoMode: context.demoMode });
  } catch {
    return failure(500, "ACTIONS_READ_FAILED", "Actions could not be loaded.");
  }
}
