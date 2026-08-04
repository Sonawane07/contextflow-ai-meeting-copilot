import { failure, success, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth/session";
import { JobInboxError, scanJobInbox } from "@/lib/integrations/google/scan-job-inbox";
import { GoogleOAuthError } from "@/lib/integrations/google/oauth";
import { isDemoMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Classification is a model call over a batch of messages; the default
// serverless budget is not always enough.
export const maxDuration = 60;

export async function POST() {
  if (isDemoMode()) {
    return failure(
      400,
      "DEMO_MODE_ACTIVE",
      "Demo mode has no mailbox to scan.",
    );
  }

  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const supabase = await createSupabaseServerClient();
    const result = await scanJobInbox(supabase, user.id);
    return success(result, { demoMode: false });
  } catch (error) {
    if (error instanceof GoogleOAuthError) {
      return failure(
        409,
        "GOOGLE_REAUTH_REQUIRED",
        "The Google connection expired. Reconnect to continue.",
      );
    }
    if (error instanceof JobInboxError) {
      return failure(400, "INBOX_SCAN_UNAVAILABLE", error.message);
    }
    return failure(500, "INBOX_SCAN_FAILED", "The inbox could not be scanned.");
  }
}
