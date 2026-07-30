import { failure, success } from "@/lib/api-response";
import { AIProviderError } from "@/lib/ai/anthropic-provider";
import { getAIProvider } from "@/lib/ai/get-provider";
import {
  actionRepository,
  meetingRepository,
} from "@/lib/demo/repositories";
import { meetingBriefSchema } from "@/lib/validation/brief";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const meeting = await meetingRepository.findById(id);
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
    await meetingRepository.saveBrief(id, brief);
    const actions = await actionRepository.upsertForMeeting(
      meeting.id,
      meeting.title,
      brief.proposedActions,
    );
    return success(
      { brief, actions },
      {
        demoMode: provider.name === "mock",
        provider: provider.name,
      },
    );
  } catch (error) {
    if (error instanceof AIProviderError) {
      return failure(502, "AI_RESPONSE_INVALID", error.message);
    }
    return failure(
      500,
      "BRIEF_GENERATION_FAILED",
      "The brief could not be generated. Please try again.",
    );
  }
}
