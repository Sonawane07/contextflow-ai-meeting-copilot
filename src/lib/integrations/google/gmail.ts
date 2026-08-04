import type { Attendee, ContextItem } from "@/types";

export class GmailError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GmailError";
  }
}

const GMAIL_LIST_ENDPOINT =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages";

/** Emails considered for a meeting: recent, and few enough to stay readable. */
export const EMAIL_LOOKBACK_DAYS = 14;
export const MAX_EMAILS_PER_MEETING = 5;
/** Gmail's query string has a practical length limit; cap the attendee fan-out. */
export const MAX_ATTENDEES_IN_QUERY = 6;

interface GmailMessageRef {
  id?: string;
}

export interface GmailMessage {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: { name?: string; value?: string }[] };
}

export function messageHeader(message: GmailMessage, name: string): string {
  return header(message, name);
}

export function isUnread(message: GmailMessage): boolean {
  return (message.labelIds ?? []).includes("UNREAD");
}

function header(message: GmailMessage, name: string): string {
  const found = message.payload?.headers?.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase(),
  );
  return found?.value ?? "";
}

/**
 * Builds a Gmail search for correspondence with a meeting's attendees.
 *
 * Relevance is by *person*, not by subject-line matching: the email that
 * matters before a meeting is rarely titled after it. Restricting to the
 * attendees keeps the search narrow enough that unrelated mail does not leak
 * into a brief.
 *
 * Returns null when there is nobody to search for — a solo event, or one where
 * the only attendee is the user.
 */
export function buildAttendeeQuery(
  attendees: Attendee[],
  selfEmail: string,
  lookbackDays = EMAIL_LOOKBACK_DAYS,
): string | null {
  const others = attendees
    .map((a) => a.email.trim().toLowerCase())
    .filter((email) => email.length > 0 && email !== selfEmail.toLowerCase())
    .filter((email, index, all) => all.indexOf(email) === index)
    .slice(0, MAX_ATTENDEES_IN_QUERY);

  if (others.length === 0) return null;

  const people = others.map((e) => `from:${e} OR to:${e}`).join(" OR ");
  // Chat and calendar-invite noise would otherwise dominate the results.
  return `(${people}) newer_than:${lookbackDays}d -in:chats -in:spam -in:trash`;
}

async function gmailFetch(
  url: string | URL,
  accessToken: string,
): Promise<Response> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    if (response.status === 403) {
      throw new GmailError(
        "Gmail access was not granted. Reconnect and tick the Gmail permission on Google's consent screen.",
        403,
      );
    }
    throw new GmailError(`Gmail returned ${response.status}.`, response.status);
  }
  return response;
}

/**
 * Fetches recent messages involving a meeting's attendees.
 *
 * Requests `format=metadata`, which returns headers and Gmail's own ~200
 * character snippet but **never the message body**. That is deliberate: a
 * snippet is enough to remind someone what a thread was about, while pulling
 * full bodies would put the entire contents of a mailbox into a database and
 * then into a model prompt. Less data, less exposure, and the brief is no
 * worse for it.
 */
export async function searchMessages(
  accessToken: string,
  query: string,
  maxResults: number,
): Promise<GmailMessage[]> {
  return fetchMeetingEmails(accessToken, query, maxResults);
}

export async function fetchMeetingEmails(
  accessToken: string,
  query: string,
  maxResults = MAX_EMAILS_PER_MEETING,
): Promise<GmailMessage[]> {
  const listUrl = new URL(GMAIL_LIST_ENDPOINT);
  listUrl.searchParams.set("q", query);
  listUrl.searchParams.set("maxResults", String(maxResults));

  const listResponse = await gmailFetch(listUrl, accessToken);
  const list = (await listResponse.json()) as { messages?: GmailMessageRef[] };
  const ids = (list.messages ?? [])
    .map((m) => m.id)
    .filter((id): id is string => Boolean(id));

  if (ids.length === 0) return [];

  const messages = await Promise.all(
    ids.map(async (id) => {
      const url = new URL(`${GMAIL_LIST_ENDPOINT}/${id}`);
      url.searchParams.set("format", "metadata");
      for (const name of ["Subject", "From", "Date"]) {
        url.searchParams.append("metadataHeaders", name);
      }
      const response = await gmailFetch(url, accessToken);
      return (await response.json()) as GmailMessage;
    }),
  );

  return messages;
}

/** A message mapped onto the app's context vocabulary, before persistence. */
export interface EmailContextDraft {
  sourceKey: string;
  title: string;
  body: string;
  sourceLabel: string;
  occurredAt: string;
}

export function toEmailContext(
  message: GmailMessage,
): EmailContextDraft | null {
  if (!message.id) return null;

  const subject = header(message, "Subject").trim();
  const from = header(message, "From").trim();
  // `internalDate` is epoch milliseconds and is always present and parseable,
  // unlike the Date header, which carries whatever the sending client wrote.
  const occurredAt = message.internalDate
    ? new Date(Number(message.internalDate)).toISOString()
    : new Date().toISOString();

  return {
    sourceKey: message.id,
    title: subject || "(no subject)",
    // Gmail's own snippet — HTML-unescaped, since it arrives entity-encoded.
    body: (message.snippet ?? "")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim(),
    sourceLabel: from ? `Email from ${from}` : "Email",
    occurredAt,
  };
}

export const EMAIL_CONTEXT_KIND: ContextItem["type"] = "email";
