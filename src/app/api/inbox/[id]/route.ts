import { z } from "zod";
import { failure, success, unauthorized } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const triageSchema = z.object({ dismissed: z.boolean() });

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Marks a tracked email as dealt with, or restores it.
 *
 * Dismissal is an explicit user action and is never inferred from mailbox
 * state — reading an email is not the same as having handled it, and only the
 * person knows the difference. Re-scanning deliberately leaves this field
 * alone so a dismissal is not undone.
 */
export async function PATCH(request: Request, routeContext: RouteContext) {
  if (isDemoMode()) {
    return failure(400, "DEMO_MODE_ACTIVE", "Demo mode has no inbox.");
  }

  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await routeContext.params;
  const payload: unknown = await request.json().catch(() => null);
  const parsed = triageSchema.safeParse(payload);
  if (!parsed.success) {
    return failure(
      400,
      "INVALID_TRIAGE",
      "Provide { dismissed: true | false }.",
      parsed.error.flatten(),
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tracked_emails")
      .update({
        dismissed_at: parsed.data.dismissed ? new Date().toISOString() : null,
      })
      .eq("user_id", user.id)
      .eq("id", id)
      .select("id, dismissed_at")
      .maybeSingle();

    if (error) throw error;
    if (!data) return failure(404, "EMAIL_NOT_FOUND", "Email not found.");

    return success(
      { id: data.id, dismissedAt: data.dismissed_at ?? undefined },
      { demoMode: false },
    );
  } catch {
    return failure(500, "TRIAGE_FAILED", "The email could not be updated.");
  }
}
