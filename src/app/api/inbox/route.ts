import { failure, success, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TrackedEmail } from "@/types";

export const dynamic = "force-dynamic";

const COLUMNS =
  "id, message_id, thread_id, subject, from_label, snippet, received_at, is_unread, category, needs_reply, reason, deadline_at, dismissed_at";

/**
 * Lists job-search email still awaiting the user.
 *
 * Dismissed rows are excluded by default — the point of the view is what is
 * outstanding, not an archive. `?include=all` returns everything.
 */
export async function GET(request: Request) {
  if (isDemoMode()) {
    // Nothing to read: the demo has no mailbox.
    return success<TrackedEmail[]>([], { demoMode: true });
  }

  const user = await getSessionUser();
  if (!user) return unauthorized();

  const includeAll =
    new URL(request.url).searchParams.get("include") === "all";

  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("tracked_emails")
      .select(COLUMNS)
      .eq("user_id", user.id);

    if (!includeAll) query = query.is("dismissed_at", null);

    const { data, error } = await query
      // Anything still owed a response first, then most recent.
      .order("needs_reply", { ascending: false })
      .order("received_at", { ascending: false });

    if (error) throw error;

    const emails: TrackedEmail[] = (data ?? []).map((row) => ({
      id: row.id,
      messageId: row.message_id,
      threadId: row.thread_id,
      subject: row.subject,
      from: row.from_label,
      snippet: row.snippet,
      receivedAt: row.received_at,
      isUnread: row.is_unread,
      category: row.category,
      needsReply: row.needs_reply,
      reason: row.reason,
      deadlineAt: row.deadline_at ?? undefined,
      dismissedAt: row.dismissed_at ?? undefined,
    }));

    return success(emails, { demoMode: false });
  } catch {
    return failure(500, "INBOX_READ_FAILED", "The inbox could not be loaded.");
  }
}
