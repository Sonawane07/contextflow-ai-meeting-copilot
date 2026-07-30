import type { AIProvider } from "@/lib/ai/provider";
import { meetingBriefOutputSchema } from "@/lib/validation/brief";
import type { Meeting } from "@/types";

const meetingResponses = {
  "product-weekly": {
    objective:
      "Choose the next activation experiment and leave with a clear owner, success signal, and delivery window.",
    contextSummary:
      "The shorter setup checklist improved completion, but template selection remains the main point of hesitation. Recent interviews suggest that a worked example could make the first choice easier, and the next development cycle creates a near-term decision deadline.",
    unresolvedQuestions: [
      "Should the team test a recommended template or a fully populated example workspace?",
      "Which segment should define the primary activation success metric?",
      "Can design and engineering support an experiment in the next cycle?",
    ],
    suggestedAgenda: [
      "Review the segmented completion signal",
      "Compare the two template-intervention options",
      "Select the success metric and audience",
      "Assign an owner and delivery checkpoint",
    ],
    proposedActions: [
      {
        id: "product-weekly-task",
        type: "create_task" as const,
        title: "Create activation experiment brief",
        description:
          "Draft the hypothesis, audience, success metric, and implementation scope for the selected template intervention.",
      },
      {
        id: "product-weekly-email",
        type: "draft_email" as const,
        title: "Draft decision recap",
        description:
          "Prepare a reviewable recap of the experiment decision, owner, and delivery checkpoint for attendees.",
      },
    ],
  },
  "launch-readiness": {
    objective:
      "Confirm release readiness, close the remaining ownership gaps, and agree on the final go/no-go checkpoint.",
    contextSummary:
      "Critical defects are closed. Final legal copy and weekend escalation coverage are the only remaining dependencies, with legal approval carrying the greatest schedule risk.",
    unresolvedQuestions: [
      "When will revised onboarding copy receive final approval?",
      "Who is the first escalation owner during the launch weekend?",
    ],
    suggestedAgenda: [
      "Review release readiness evidence",
      "Resolve legal-copy ownership",
      "Confirm the escalation roster",
      "Set the final go/no-go checkpoint",
    ],
    proposedActions: [
      {
        id: "launch-readiness-task",
        type: "create_task" as const,
        title: "Track final copy approval",
        description:
          "Create an internal task with an owner and deadline for final onboarding copy approval.",
      },
      {
        id: "launch-readiness-follow-up",
        type: "schedule_follow_up" as const,
        title: "Schedule go/no-go checkpoint",
        description:
          "Propose a 20-minute final launch decision meeting after legal approval is expected.",
      },
    ],
  },
  "customer-discovery": {
    objective:
      "Translate the discovery conversation into validated product signals and a focused, low-risk pilot follow-up.",
    contextSummary:
      "Northstar is primarily concerned with adoption across distributed teams. They requested a proposal covering governance, rollout sequencing, and admin reporting; a phased pilot is the strongest current response to that risk.",
    unresolvedQuestions: [
      "Which team should participate in the first pilot phase?",
      "What admin reporting is required before rollout approval?",
      "Who will own change management on the customer side?",
    ],
    suggestedAgenda: [
      "Separate confirmed needs from assumptions",
      "Define the smallest useful pilot",
      "Identify reporting and governance gaps",
      "Agree on customer-facing follow-up",
    ],
    proposedActions: [
      {
        id: "customer-discovery-email",
        type: "draft_email" as const,
        title: "Draft phased pilot proposal",
        description:
          "Prepare a customer-ready pilot outline for internal review; do not send it automatically.",
      },
      {
        id: "customer-discovery-task",
        type: "create_task" as const,
        title: "Document admin reporting needs",
        description:
          "Create a discovery follow-up task to validate the required admin reporting fields.",
      },
    ],
  },
} satisfies Record<string, unknown>;

export class MockAIProvider implements AIProvider {
  readonly name = "mock" as const;

  async generateMeetingBrief(meeting: Meeting) {
    const response =
      meetingResponses[meeting.id as keyof typeof meetingResponses] ??
      meetingResponses["product-weekly"];
    return meetingBriefOutputSchema.parse(structuredClone(response));
  }
}
