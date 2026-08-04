import { failure, success, unauthorized } from "@/lib/api-response";
import { getRequestContext } from "@/lib/request-context";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, routeContext: RouteContext) {
  const context = await getRequestContext();
  if (!context) return unauthorized();

  const { id } = await routeContext.params;

  try {
    const meeting = await context.meetings.findById(id);
    if (!meeting) {
      return failure(404, "MEETING_NOT_FOUND", "Meeting not found.");
    }
    return success(meeting, { demoMode: context.demoMode });
  } catch {
    return failure(500, "MEETING_READ_FAILED", "The meeting could not be loaded.");
  }
}
