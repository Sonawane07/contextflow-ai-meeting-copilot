import { failure, success, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth/session";
import { isTokenEncryptionConfigured } from "@/lib/crypto/tokens";
import { isGoogleCalendarConfigured } from "@/lib/integrations/google/config";
import { getConnectionSummary } from "@/lib/integrations/google/connection-store";
import { isDemoMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Reports what the deployment can connect to and what this user has connected.
 *
 * The UI uses `available` to decide between showing a Connect button and
 * explaining why the option is absent, so a missing key surfaces as a message
 * rather than a button that fails.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const demoMode = isDemoMode();
  const available = isGoogleCalendarConfigured() && isTokenEncryptionConfigured();

  if (demoMode) {
    return success(
      { google: { available: false, reason: "demo-mode" as const, connection: null } },
      { demoMode },
    );
  }

  if (!available) {
    const reason = !isGoogleCalendarConfigured()
      ? ("not-configured" as const)
      : ("encryption-key-missing" as const);
    return success({ google: { available, reason, connection: null } }, { demoMode });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const connection = await getConnectionSummary(supabase, user.id);
    return success({ google: { available, reason: null, connection } }, { demoMode });
  } catch {
    return failure(
      500,
      "INTEGRATIONS_READ_FAILED",
      "Integration status could not be loaded.",
    );
  }
}
