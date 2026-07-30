import { failure, success } from "@/lib/api-response";
import { meetingRepository } from "@/lib/demo/repositories";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const meeting = await meetingRepository.findById(id);
  if (!meeting) {
    return failure(404, "MEETING_NOT_FOUND", "Meeting not found.");
  }
  return success(meeting, {
    demoMode: process.env.DEMO_MODE !== "false",
  });
}
