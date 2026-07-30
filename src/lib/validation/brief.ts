import { z } from "zod";

export const actionTypeSchema = z.enum([
  "draft_email",
  "create_task",
  "schedule_follow_up",
]);

export const proposedActionSchema = z.object({
  id: z.string().min(1),
  type: actionTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
});

export const meetingBriefOutputSchema = z.object({
  objective: z.string().min(1),
  contextSummary: z.string().min(1),
  unresolvedQuestions: z.array(z.string().min(1)),
  suggestedAgenda: z.array(z.string().min(1)),
  proposedActions: z.array(proposedActionSchema),
});

export const meetingBriefSchema = meetingBriefOutputSchema.extend({
  generatedAt: z.iso.datetime(),
  provider: z.enum(["mock", "anthropic"]),
});

export type MeetingBriefOutput = z.infer<typeof meetingBriefOutputSchema>;
