import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  DEMO_USER,
  deriveDisplayName,
  deriveInitials,
  getSessionUser,
  toSessionUser,
} from "@/lib/auth/session";

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "6b1f1a1e-0000-4000-8000-000000000001",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    email: "maya.chen@example.test",
    ...overrides,
  } as User;
}

describe("deriveDisplayName", () => {
  it("prefers the full name from user metadata", () => {
    const user = buildUser({ user_metadata: { full_name: "Maya Chen" } });
    expect(deriveDisplayName(user)).toBe("Maya Chen");
  });

  it("ignores a blank metadata name and falls back to the email local part", () => {
    const user = buildUser({ user_metadata: { full_name: "   " } });
    expect(deriveDisplayName(user)).toBe("maya.chen");
  });

  it("stays readable when the account has no email", () => {
    const user = buildUser({ email: undefined, user_metadata: {} });
    expect(deriveDisplayName(user)).toBe("Signed-in user");
  });
});

describe("deriveInitials", () => {
  it.each([
    ["Maya Chen", "MC"],
    ["maya.chen", "MC"],
    ["jon_bell", "JB"],
    ["Prisha", "P"],
    ["Ada Lovelace King", "AL"],
  ])("derives %s into %s", (input, expected) => {
    expect(deriveInitials(input)).toBe(expected);
  });

  it("falls back to a product initial when nothing usable remains", () => {
    expect(deriveInitials("   ")).toBe("CF");
  });
});

describe("toSessionUser", () => {
  it("marks a real Supabase user as non-demo", () => {
    const session = toSessionUser(
      buildUser({ user_metadata: { full_name: "Maya Chen" } }),
    );
    expect(session).toMatchObject({
      email: "maya.chen@example.test",
      displayName: "Maya Chen",
      initials: "MC",
      isDemo: false,
    });
  });
});

describe("getSessionUser", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the demo identity without contacting Supabase in demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    await expect(getSessionUser()).resolves.toEqual(DEMO_USER);
    expect(DEMO_USER.isDemo).toBe(true);
  });
});
