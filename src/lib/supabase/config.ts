/**
 * Runtime mode detection.
 *
 * ContextFlow keeps its credential-free demo path as the default. Persistent
 * Supabase repositories and real authentication activate only when the project
 * is explicitly opted out of demo mode *and* the Supabase environment is fully
 * configured. A half-configured deployment stays in demo mode instead of
 * failing at request time.
 *
 * These read `process.env` inside functions rather than at module scope so that
 * tests can stub the environment per case.
 */

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseUrl().length > 0 && getSupabaseAnonKey().length > 0;
}

export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === "false") {
    return !isSupabaseConfigured();
  }
  return true;
}
