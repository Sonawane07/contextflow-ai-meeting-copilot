import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import type { ContextFlowSupabaseClient } from "@/lib/supabase/server";

export class AdminClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminClientError";
  }
}

export function isAdminConfigured(): boolean {
  return (
    getSupabaseUrl().length > 0 &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0
  );
}

/**
 * Service-role client for work that runs without a user session.
 *
 * This client **bypasses row-level security**. It exists only for background
 * jobs, which have no session cookie and therefore no `auth.uid()` for policies
 * to match against. Two rules follow from that:
 *
 *  1. It must never be constructed on a request path. Anything serving a user
 *     goes through `createSupabaseServerClient` so RLS still applies.
 *  2. Every query made with it must be scoped by `user_id` in application code,
 *     because the database will no longer do it. The repositories filter
 *     explicitly for exactly this reason.
 *
 * Session persistence is disabled so this client can never pick up or write a
 * user's auth state.
 */
export function createSupabaseAdminClient(): ContextFlowSupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || getSupabaseUrl().length === 0) {
    throw new AdminClientError(
      "The service-role client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient<Database>(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
