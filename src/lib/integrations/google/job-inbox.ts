import type { EmailClassification } from "@/lib/validation/job-inbox";

/**
 * Finding mail about a job search.
 *
 * Two stages on purpose. A Gmail query is cheap and does the coarse filtering,
 * but keyword matching alone cannot tell an interview invite from a newsletter
 * that happens to say "opportunity" — so the survivors are classified properly
 * (see `classifyJobEmails`). The query is tuned for recall: a false positive is
 * a row the classifier discards, while a false negative is the missed email
 * this feature exists to prevent.
 */

export const JOB_INBOX_LOOKBACK_DAYS = 30;
export const MAX_CANDIDATES = 40;

/** Applicant tracking systems almost every company sends through. */
const ATS_SENDERS = [
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "myworkday.com",
  "smartrecruiters.com",
  "icims.com",
  "jobvite.com",
  "workable.com",
  "breezy.hr",
  "recruitee.com",
  "hire.lever.co",
];

const SUBJECT_TERMS = [
  "interview",
  "application",
  "next steps",
  "offer",
  "opportunity",
  "recruiter",
  "hiring",
  "position",
  "role",
  "candidate",
  "assessment",
  "take-home",
  "screening",
];

export function buildJobInboxQuery(
  lookbackDays = JOB_INBOX_LOOKBACK_DAYS,
): string {
  const subjects = SUBJECT_TERMS.map((t) =>
    t.includes(" ") ? `subject:"${t}"` : `subject:${t}`,
  ).join(" OR ");
  const senders = ATS_SENDERS.map((d) => `from:${d}`).join(" OR ");
  return `newer_than:${lookbackDays}d -in:chats -in:spam -in:trash (${subjects} OR ${senders})`;
}

/**
 * A heuristic first pass.
 *
 * Runs whether or not a model is available, so the feature degrades to
 * something useful rather than nothing when Anthropic is unconfigured or
 * failing. The model refines these; it does not replace them.
 */
export function heuristicClassification(message: {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  isUnread: boolean;
}): EmailClassification {
  const haystack = `${message.subject} ${message.snippet}`.toLowerCase();
  const test = (...terms: string[]) => terms.some((t) => haystack.includes(t));

  // Ordered by consequence: a rejection that also says "interview" is still a
  // rejection, and an offer outranks a scheduling note.
  if (test("unfortunately", "not moving forward", "decided to proceed with", "unsuccessful")) {
    return {
      messageId: message.id,
      category: "rejection",
      needsReply: false,
      reason: "Wording matches a rejection.",
    };
  }
  if (test("offer letter", "pleased to offer", "job offer")) {
    return {
      messageId: message.id,
      category: "offer",
      needsReply: true,
      reason: "Appears to contain an offer.",
    };
  }
  if (test("take-home", "assessment", "coding challenge", "technical screen")) {
    return {
      messageId: message.id,
      category: "assessment",
      needsReply: true,
      reason: "Mentions an assessment or technical screen.",
    };
  }
  if (test("schedule", "availability", "calendly", "book a time", "interview")) {
    return {
      messageId: message.id,
      category: "interview_invite",
      needsReply: true,
      reason: "Mentions scheduling or an interview.",
    };
  }
  if (test("received your application", "thanks for applying", "application received")) {
    return {
      messageId: message.id,
      category: "acknowledgement",
      needsReply: false,
      reason: "Automated acknowledgement.",
    };
  }
  return {
    messageId: message.id,
    category: "other",
    needsReply: message.isUnread,
    reason: message.isUnread
      ? "Unread and job-related; not otherwise classified."
      : "Job-related; no action detected.",
  };
}

/**
 * Merges model output over the heuristic baseline.
 *
 * Anything the model did not return keeps its heuristic classification, so a
 * truncated or partial response degrades rather than dropping emails.
 */
export function mergeClassifications(
  baseline: EmailClassification[],
  refined: EmailClassification[],
): EmailClassification[] {
  const byId = new Map(refined.map((c) => [c.messageId, c]));
  return baseline.map((base) => byId.get(base.messageId) ?? base);
}
