import "server-only";

import { classifyJobEmails } from "@/lib/ai/classify-job-emails";
import { hasGmailScope } from "@/lib/integrations/google/config";
import { getValidAccessToken } from "@/lib/integrations/google/connection-store";
import {
  isUnread,
  messageHeader,
  searchMessages,
} from "@/lib/integrations/google/gmail";
import {
  MAX_CANDIDATES,
  buildJobInboxQuery,
  heuristicClassification,
  mergeClassifications,
} from "@/lib/integrations/google/job-inbox";
import { RepositoryError } from "@/lib/supabase/repositories";
import type { ContextFlowSupabaseClient } from "@/lib/supabase/server";
import type { EmailClassification } from "@/lib/validation/job-inbox";

export class JobInboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobInboxError";
  }
}

export interface JobInboxScanResult {
  scanned: number;
  tracked: number;
  needingReply: number;
  scannedAt: string;
}

function decodeSnippet(raw: string): string {
  return raw
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/**
 * Refreshes the job-application inbox.
 *
 * Read-only with respect to Gmail: nothing is sent, replied to, or marked
 * read. The only state this owns is the triage, and `dismissed_at` is never
 * set here — only the person knows whether an email is actually handled.
 */
export async function scanJobInbox(
  client: ContextFlowSupabaseClient,
  userId: string,
  now = new Date(),
): Promise<JobInboxScanResult> {
  const { data: connection } = await client
    .from("calendar_connections")
    .select("scope")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (!connection) {
    throw new JobInboxError("Connect Google to track job-application email.");
  }
  if (!hasGmailScope(connection.scope)) {
    throw new JobInboxError(
      "Gmail access was not granted. Reconnect and tick the Gmail permission.",
    );
  }

  const accessToken = await getValidAccessToken(client, userId);
  if (!accessToken) {
    throw new JobInboxError("The Google connection is no longer valid.");
  }

  const messages = await searchMessages(
    accessToken,
    buildJobInboxQuery(),
    MAX_CANDIDATES,
  );

  const candidates = messages
    .filter((m) => m.id && m.threadId)
    .map((m) => ({
      id: m.id!,
      threadId: m.threadId!,
      subject: messageHeader(m, "Subject").trim() || "(no subject)",
      from: messageHeader(m, "From").trim(),
      snippet: decodeSnippet(m.snippet ?? ""),
      receivedAt: m.internalDate
        ? new Date(Number(m.internalDate)).toISOString()
        : now.toISOString(),
      isUnread: isUnread(m),
    }));

  if (candidates.length === 0) {
    return { scanned: 0, tracked: 0, needingReply: 0, scannedAt: now.toISOString() };
  }

  // The heuristic is the floor; the model refines it. A model failure leaves
  // the heuristic result standing rather than failing the scan.
  const baseline: EmailClassification[] = candidates.map(
    heuristicClassification,
  );
  let refined: EmailClassification[] = [];
  try {
    refined = await classifyJobEmails(candidates);
  } catch {
    refined = [];
  }
  const classifications = mergeClassifications(baseline, refined);
  const byId = new Map(classifications.map((c) => [c.messageId, c]));

  const rows = candidates.map((candidate) => {
    const c = byId.get(candidate.id)!;
    return {
      user_id: userId,
      message_id: candidate.id,
      thread_id: candidate.threadId,
      subject: candidate.subject,
      from_label: candidate.from,
      snippet: candidate.snippet,
      received_at: candidate.receivedAt,
      is_unread: candidate.isUnread,
      category: c.category,
      needs_reply: c.needsReply,
      reason: c.reason,
      deadline_at: c.deadline ? `${c.deadline}T00:00:00.000Z` : null,
      last_scanned_at: now.toISOString(),
    };
  });

  // `dismissed_at` is intentionally absent from the payload: re-scanning must
  // not resurrect something the user has already dealt with.
  const { error } = await client
    .from("tracked_emails")
    .upsert(rows as never, { onConflict: "user_id,message_id" });

  if (error) {
    throw new RepositoryError("Tracked email could not be saved.", error);
  }

  return {
    scanned: candidates.length,
    tracked: rows.length,
    needingReply: rows.filter((r) => r.needs_reply).length,
    scannedAt: now.toISOString(),
  };
}
