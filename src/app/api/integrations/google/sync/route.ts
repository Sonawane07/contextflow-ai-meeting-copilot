import { failure, success, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth/session";
import { GoogleOAuthError } from "@/lib/integrations/google/oauth";
import { CalendarSyncError, syncCalendar } from "@/lib/integrations/google/sync";
import { isDemoMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  if (isDemoMode()) {
    return failure(
      400,
      "DEMO_MODE_ACTIVE",
      "Demo mode uses synthetic meetings and has nothing to sync.",
    );
  }

  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const supabase = await createSupabaseServerClient();
    const result = await syncCalendar(supabase, user.id);
    return success(result, { demoMode: false });
  } catch (error) {
    // An expired refresh token is the common failure — Google expires them
    // after seven days while the OAuth app is in Testing status — and it needs
    // a reconnect, so it gets its own status rather than a generic 500.
    if (error instanceof GoogleOAuthError) {
      return failure(
        409,
        "GOOGLE_REAUTH_REQUIRED",
        "The Google connection expired. Reconnect the calendar to continue.",
      );
    }
    if (error instanceof CalendarSyncError) {
      return failure(502, "CALENDAR_SYNC_FAILED", error.message);
    }
    return failure(500, "CALENDAR_SYNC_FAILED", "The calendar could not be synced.");
  }
}
