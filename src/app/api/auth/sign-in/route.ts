import { failure, success } from "@/lib/api-response";
import { toSessionUser } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/supabase/config";
import { ensureWorkspaceSeeded } from "@/lib/supabase/seed-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  if (isDemoMode()) {
    return failure(
      400,
      "DEMO_MODE_ACTIVE",
      "Demo mode is active, so no sign-in is required.",
    );
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(payload);
  if (!parsed.success) {
    return failure(
      400,
      "INVALID_CREDENTIALS_PAYLOAD",
      "Enter a valid email address and a password of at least 8 characters.",
      parsed.error.flatten(),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  // The provider's message is deliberately not forwarded: it distinguishes
  // "unknown account" from "wrong password", which enumerates registered users.
  if (error || !data.user) {
    return failure(
      401,
      "SIGN_IN_FAILED",
      "That email and password combination did not match an account.",
    );
  }

  await ensureWorkspaceSeeded(supabase, data.user.id);

  return success(
    { user: toSessionUser(data.user) },
    { demoMode: false },
  );
}
