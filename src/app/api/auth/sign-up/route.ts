import { failure, success } from "@/lib/api-response";
import { toSessionUser } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/supabase/config";
import { ensureWorkspaceSeeded } from "@/lib/supabase/seed-workspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  if (isDemoMode()) {
    return failure(
      400,
      "DEMO_MODE_ACTIVE",
      "Demo mode is active, so no account is required.",
    );
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(payload);
  if (!parsed.success) {
    return failure(
      400,
      "INVALID_CREDENTIALS_PAYLOAD",
      "Enter a valid email address and a password of at least 8 characters.",
      parsed.error.flatten(),
    );
  }

  const { email, password, displayName } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: displayName ? { data: { full_name: displayName } } : undefined,
  });

  if (error || !data.user) {
    // Name the failures a person can act on. `user_already_exists` is
    // deliberately *not* among them — saying so would let anyone test which
    // addresses hold accounts.
    if (error?.code === "email_address_invalid") {
      return failure(
        400,
        "EMAIL_REJECTED",
        "That email address was rejected as invalid.",
      );
    }
    if (error?.code === "weak_password") {
      return failure(
        400,
        "WEAK_PASSWORD",
        "That password was rejected. Try a longer or less common one.",
      );
    }
    if (error?.status === 429) {
      // Supabase sends a confirmation email on sign-up, and the built-in SMTP
      // allowance is small. Reported as a rate limit rather than a bad email,
      // which is what the generic message used to imply.
      return failure(
        429,
        "SIGN_UP_RATE_LIMITED",
        "Too many sign-up attempts. Wait a few minutes, or disable email confirmation in Supabase for a single-user deployment.",
      );
    }
    return failure(
      400,
      "SIGN_UP_FAILED",
      "The account could not be created. Try a different email address.",
    );
  }

  // With email confirmation enabled, sign-up returns a user but no session.
  // Seeding needs an authenticated client, so it is deferred to first sign-in.
  if (!data.session) {
    return success(
      { user: null, confirmationRequired: true },
      { demoMode: false },
    );
  }

  await ensureWorkspaceSeeded(supabase, data.user.id);

  return success(
    { user: toSessionUser(data.user), confirmationRequired: false },
    { demoMode: false },
  );
}
