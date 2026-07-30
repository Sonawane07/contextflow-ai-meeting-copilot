import type { Meeting } from "@/types";
import type { MeetingBriefOutput } from "@/lib/validation/brief";

export interface AIProvider {
  readonly name: "mock" | "anthropic";
  generateMeetingBrief(meeting: Meeting): Promise<MeetingBriefOutput>;
}
