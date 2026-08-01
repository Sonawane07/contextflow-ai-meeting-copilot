import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoActionRepository } from "@/lib/demo/repositories";
import { getRequestContext } from "@/lib/request-context";

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...actual, getSessionUser: vi.fn(actual.getSessionUser) };
});

const { getSessionUser } = await import("@/lib/auth/session");

describe("getRequestContext", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(getSessionUser).mockReset();
  });

  it("serves demo repositories and the demo identity in demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "demo",
      email: "demo@contextflow.test",
      displayName: "Demo User",
      initials: "DU",
      isDemo: true,
    });

    const context = await getRequestContext();

    expect(context).not.toBeNull();
    expect(context?.demoMode).toBe(true);
    expect(context?.user.displayName).toBe("Demo User");
    expect(context?.actions).toBeInstanceOf(DemoActionRepository);
  });

  it("returns null instead of falling back to demo data when unauthenticated", async () => {
    // The important property: a request with no session must not be handed a
    // populated workspace, whichever mode the deployment is running in.
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.mocked(getSessionUser).mockResolvedValue(null);

    await expect(getRequestContext()).resolves.toBeNull();
  });
});
