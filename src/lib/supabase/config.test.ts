import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase/config";

function setEnv(env: {
  demoMode?: string;
  url?: string;
  anonKey?: string;
}) {
  vi.stubEnv("DEMO_MODE", env.demoMode ?? "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", env.url ?? "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", env.anonKey ?? "");
}

const CONFIGURED = {
  url: "https://project.supabase.co",
  anonKey: "anon-key",
};

describe("runtime mode detection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("treats a fully configured project as configured", () => {
    setEnv(CONFIGURED);
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("does not treat a partially configured project as configured", () => {
    setEnv({ url: CONFIGURED.url });
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("defaults to demo mode when DEMO_MODE is unset", () => {
    setEnv(CONFIGURED);
    expect(isDemoMode()).toBe(true);
  });

  it("stays in demo mode when DEMO_MODE is any value other than 'false'", () => {
    setEnv({ ...CONFIGURED, demoMode: "true" });
    expect(isDemoMode()).toBe(true);
  });

  it("uses the persistent path only when opted out and fully configured", () => {
    setEnv({ ...CONFIGURED, demoMode: "false" });
    expect(isDemoMode()).toBe(false);
  });

  it("falls back to demo mode when opted out but Supabase is misconfigured", () => {
    // A half-configured deployment must not attempt real queries and fail at
    // request time; it degrades to the credential-free path instead.
    setEnv({ demoMode: "false", url: CONFIGURED.url });
    expect(isDemoMode()).toBe(true);
  });
});
