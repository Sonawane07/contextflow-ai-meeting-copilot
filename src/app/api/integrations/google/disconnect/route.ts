import { failure, success, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth/session";
import { deleteConnection } from "@/lib/integrations/google/connection-store";
import { isDemoMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Removes the connection and revokes the grant at Google.
 *
 * Meetings already imported are deliberately left in place: they may carry
 * briefs and approved actions, which record decisions a person made.
 */
export async function POST() {
  if (isDemoMode()) {
    return failure(400, "DEMO_MODE_ACTIVE", "Demo mode has no connection to remove.");
  }

  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const supabase = await createSupabaseServerClient();
    const { revoked } = await deleteConnection(supabase, user.id);
    return success({ disconnected: true, revokedAtGoogle: revoked }, { demoMode: false });
  } catch {
    return failure(
      500,
      "CALENDAR_DISCONNECT_FAILED",
      "The calendar could not be disconnected.",
    );
  }
}
