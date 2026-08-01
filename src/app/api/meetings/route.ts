import { failure, success, unauthorized } from "@/lib/api-response";
import { getRequestContext } from "@/lib/request-context";

export async function GET() {
  const context = await getRequestContext();
  if (!context) return unauthorized();

  try {
    const meetings = await context.meetings.list();
    return success(meetings, { demoMode: context.demoMode });
  } catch {
    return failure(500, "MEETINGS_READ_FAILED", "Meetings could not be loaded.");
  }
}
