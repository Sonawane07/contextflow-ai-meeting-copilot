import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export type ContextFlowSupabaseClient = SupabaseClient<Database>;

/**
 * Request-scoped Supabase client.
 *
 * Every query issued through this client carries the caller's session cookie,
 * so row-level security scopes results to `auth.uid()`. The repository layer
 * never filters by user id defensively in `select` statements — that guarantee
 * belongs to the database, and duplicating it in application code would hide
 * a policy regression rather than surface it.
 *
 * Only the anon key is used here. The service-role key bypasses RLS and must
 * never reach a request-scoped client.
 */
export async function createSupabaseServerClient(): Promise<ContextFlowSupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Middleware refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
