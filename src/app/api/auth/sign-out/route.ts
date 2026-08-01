import { failure, success } from "@/lib/api-response";
import { isDemoMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  if (isDemoMode()) {
    return failure(
      400,
      "DEMO_MODE_ACTIVE",
      "Demo mode has no session to end.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return failure(500, "SIGN_OUT_FAILED", "The session could not be ended.");
  }
  return success({ signedOut: true }, { demoMode: false });
}
