import { failure, success, unauthorized } from "@/lib/api-response";
import { AIProviderError } from "@/lib/ai/anthropic-provider";
import { getAIProvider } from "@/lib/ai/get-provider";
import { getRequestContext } from "@/lib/request-context";
import { meetingBriefSchema } from "@/lib/validation/brief";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, routeContext: RouteContext) {
  const context = await getRequestContext();
  if (!context) return unauthorized();

  const { id } = await routeContext.params;
  const meeting = await context.meetings.findById(id);
  if (!meeting) {
    return failure(404, "MEETING_NOT_FOUND", "Meeting not found.");
  }

  try {
    const provider = getAIProvider();
    const output = await provider.generateMeetingBrief(meeting);
    const brief = meetingBriefSchema.parse({
      ...output,
      generatedAt: new Date().toISOString(),
      provider: provider.name,
    });

    // The brief is persisted first so that proposed actions can be attached to
    // it. Regenerating a brief re-syncs its proposals without resetting any
    // decision a human has already recorded.
    await context.meetings.saveBrief(id, brief);
    const actions = await context.actions.upsertForMeeting(
      meeting.id,
      meeting.title,
      brief.proposedActions,
    );

    return success(
      { brief, actions },
      { demoMode: context.demoMode, provider: provider.name },
    );
  } catch (error) {
    // The provider has already reduced this to an operator-actionable
    // sentence with nothing sensitive in it, so it is safe to pass through —
    // a misconfigured key or an empty account would otherwise be
    // indistinguishable from a bug.
    if (error instanceof AIProviderError) {
      return failure(502, "AI_PROVIDER_ERROR", error.message);
    }
    return failure(
      500,
      "BRIEF_GENERATION_FAILED",
      "The brief could not be generated. Please try again.",
    );
  }
}
