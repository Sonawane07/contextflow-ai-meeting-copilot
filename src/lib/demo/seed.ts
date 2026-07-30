import type {
  AuditLog,
  FollowUpAction,
  Meeting,
  MeetingBrief,
} from "@/types";

function futureDate(daysFromNow: number, hour: number, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() + daysFromNow);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
}

function minutesAfter(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

const productStart = futureDate(1, 10);
const launchStart = futureDate(2, 14, 30);
const customerStart = futureDate(4, 11);
const generatedAt = futureDate(-1, 16);

const launchBrief: MeetingBrief = {
  objective:
    "Align the launch team on release readiness, open ownership gaps, and the decision timeline.",
  contextSummary:
    "The beta checklist is nearly complete. Legal copy and the final support rotation remain the two dependencies most likely to affect the release date.",
  unresolvedQuestions: [
    "Who owns final approval of the revised onboarding copy?",
    "Does the support rotation cover the first launch weekend?",
  ],
  suggestedAgenda: [
    "Review readiness signals",
    "Resolve ownership gaps",
    "Confirm go/no-go decision time",
  ],
  proposedActions: [],
  generatedAt,
  provider: "mock",
};

export const seedMeetings: Meeting[] = [
  {
    id: "product-weekly",
    title: "Product weekly: activation",
    summary: "Review onboarding signals and select the next activation experiment.",
    startsAt: productStart,
    endsAt: minutesAfter(productStart, 45),
    location: "Video call · Atlas room",
    attendees: [
      {
        name: "Maya Chen",
        email: "maya@example.test",
        role: "Product lead",
        initials: "MC",
      },
      {
        name: "Jon Bell",
        email: "jon@example.test",
        role: "Engineering",
        initials: "JB",
      },
      {
        name: "Ari Morgan",
        email: "ari@example.test",
        role: "Design",
        initials: "AM",
      },
    ],
    contextItems: [
      {
        id: "ctx-activation-email",
        type: "email",
        title: "Activation experiment results",
        body:
          "The shorter setup checklist increased completion, but teams still pause when choosing their first workspace template.",
        sourceLabel: "Synthetic email",
        occurredAt: futureDate(-2, 9),
      },
      {
        id: "ctx-activation-note",
        type: "note",
        title: "Research synthesis",
        body:
          "Four of six interview participants wanted an example workspace before committing to a template.",
        sourceLabel: "Synthetic research note",
        occurredAt: futureDate(-3, 15),
      },
      {
        id: "ctx-activation-calendar",
        type: "calendar",
        title: "Experiment decision window",
        body:
          "The next development cycle begins Monday, so the experiment needs an owner by Friday.",
        sourceLabel: "Synthetic calendar context",
        occurredAt: futureDate(-1, 12),
      },
    ],
    actionItems: [
      {
        id: "existing-activation-1",
        title: "Share segmented completion data",
        owner: "Maya Chen",
        completed: true,
      },
      {
        id: "existing-activation-2",
        title: "Prepare template prototype",
        owner: "Ari Morgan",
        completed: false,
      },
    ],
  },
  {
    id: "launch-readiness",
    title: "Launch readiness review",
    summary: "Confirm owners and clear the final release dependencies.",
    startsAt: launchStart,
    endsAt: minutesAfter(launchStart, 60),
    location: "Studio 2 · Hybrid",
    attendees: [
      {
        name: "Sam Rivera",
        email: "sam@example.test",
        role: "Program lead",
        initials: "SR",
      },
      {
        name: "Priya Shah",
        email: "priya@example.test",
        role: "Engineering",
        initials: "PS",
      },
      {
        name: "Noah Williams",
        email: "noah@example.test",
        role: "Customer success",
        initials: "NW",
      },
      {
        name: "Elena Park",
        email: "elena@example.test",
        role: "Legal",
        initials: "EP",
      },
    ],
    contextItems: [
      {
        id: "ctx-launch-email",
        type: "email",
        title: "Beta exit checklist",
        body:
          "All critical defects are closed. Two low-risk copy changes and the weekend escalation schedule remain open.",
        sourceLabel: "Synthetic email",
        occurredAt: futureDate(-1, 11),
      },
      {
        id: "ctx-launch-note",
        type: "note",
        title: "Launch risk review",
        body:
          "The team agreed that unresolved legal copy is the only item that can move the release date.",
        sourceLabel: "Synthetic planning note",
        occurredAt: futureDate(-4, 14),
      },
    ],
    actionItems: [
      {
        id: "existing-launch-1",
        title: "Publish escalation roster",
        owner: "Noah Williams",
        completed: false,
      },
      {
        id: "existing-launch-2",
        title: "Close launch-blocking defects",
        owner: "Priya Shah",
        completed: true,
      },
    ],
    brief: launchBrief,
  },
  {
    id: "customer-discovery",
    title: "Northstar discovery debrief",
    summary: "Turn a customer conversation into product signals and clear follow-ups.",
    startsAt: customerStart,
    endsAt: minutesAfter(customerStart, 30),
    location: "Video call",
    attendees: [
      {
        name: "Leo Grant",
        email: "leo@example.test",
        role: "Account lead",
        initials: "LG",
      },
      {
        name: "Fatima Noor",
        email: "fatima@example.test",
        role: "Product",
        initials: "FN",
      },
      {
        name: "Tess Avery",
        email: "tess@example.test",
        role: "Solutions",
        initials: "TA",
      },
    ],
    contextItems: [
      {
        id: "ctx-discovery-email",
        type: "email",
        title: "Northstar follow-up",
        body:
          "The customer asked for a concise proposal covering workspace governance, rollout sequencing, and admin reporting.",
        sourceLabel: "Synthetic email",
        occurredAt: futureDate(-1, 16),
      },
      {
        id: "ctx-discovery-note",
        type: "note",
        title: "Call notes",
        body:
          "Their primary concern is adoption across distributed teams, not feature depth. A phased pilot may reduce risk.",
        sourceLabel: "Synthetic meeting note",
        occurredAt: futureDate(-2, 13),
      },
    ],
    actionItems: [
      {
        id: "existing-discovery-1",
        title: "Summarize governance requirements",
        owner: "Tess Avery",
        completed: false,
      },
    ],
  },
];

export const seedActions: FollowUpAction[] = [
  {
    id: "seed-action-pending",
    meetingId: "customer-discovery",
    meetingTitle: "Northstar discovery debrief",
    type: "draft_email",
    title: "Draft pilot recap",
    description:
      "Prepare a concise recap of the proposed pilot sequence for review before sending.",
    status: "pending",
    createdAt: futureDate(-1, 17),
  },
  {
    id: "seed-action-approved",
    meetingId: "launch-readiness",
    meetingTitle: "Launch readiness review",
    type: "create_task",
    title: "Assign onboarding copy review",
    description: "Create an internal task for the final legal copy review.",
    status: "approved",
    createdAt: futureDate(-3, 12),
    decidedAt: futureDate(-2, 9),
  },
  {
    id: "seed-action-rejected",
    meetingId: "product-weekly",
    meetingTitle: "Product weekly: activation",
    type: "schedule_follow_up",
    title: "Schedule daily activation sync",
    description: "Schedule a daily recurring sync for the activation experiment.",
    status: "rejected",
    createdAt: futureDate(-4, 10),
    decidedAt: futureDate(-3, 10),
  },
];

export const seedAuditLogs: AuditLog[] = [
  {
    id: "audit-approved",
    actionId: "seed-action-approved",
    actionTitle: "Assign onboarding copy review",
    meetingId: "launch-readiness",
    meetingTitle: "Launch readiness review",
    status: "approved",
    actor: "Demo User",
    timestamp: futureDate(-2, 9),
  },
  {
    id: "audit-rejected",
    actionId: "seed-action-rejected",
    actionTitle: "Schedule daily activation sync",
    meetingId: "product-weekly",
    meetingTitle: "Product weekly: activation",
    status: "rejected",
    actor: "Demo User",
    timestamp: futureDate(-3, 10),
  },
];
