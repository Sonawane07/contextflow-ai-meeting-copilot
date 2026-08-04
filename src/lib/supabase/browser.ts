"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

let client: SupabaseClient<Database> | null = null;

/**
 * Browser Supabase client, used only for auth state changes in the UI.
 *
 * Data access stays on the server behind the API routes so that repository
 * behaviour, validation, and the approval boundary are enforced in one place.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  client ??= createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
  );
  return client;
}
