import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizationUrl,
  createPkcePair,
  createStateToken,
} from "@/lib/integrations/google/oauth";

describe("createPkcePair", () => {
  it("derives the challenge as base64url(sha256(verifier))", () => {
    const { verifier, challenge } = createPkcePair();
    const expected = createHash("sha256").update(verifier).digest("base64url");
    expect(challenge).toBe(expected);
  });

  it("is unpredictable between calls", () => {
    expect(createPkcePair().verifier).not.toBe(createPkcePair().verifier);
    expect(createStateToken()).not.toBe(createStateToken());
  });

  it("produces URL-safe values needing no escaping", () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("buildAuthorizationUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function build() {
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-123.apps.googleusercontent.com");
    return new URL(
      buildAuthorizationUrl({
        redirectUri: "https://app.test/api/integrations/google/callback",
        state: "state-token",
        codeChallenge: "challenge-value",
      }),
    );
  }

  it("targets Google's authorization endpoint", () => {
    expect(build().origin + build().pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
  });

  it("requests offline access with forced consent", () => {
    // Without both, Google returns no refresh token and the connection dies
    // in an hour with no way for a background job to renew it.
    const params = build().searchParams;
    expect(params.get("access_type")).toBe("offline");
    expect(params.get("prompt")).toBe("consent");
  });

  it("sends the PKCE challenge using S256, never plain", () => {
    const params = build().searchParams;
    expect(params.get("code_challenge")).toBe("challenge-value");
    expect(params.get("code_challenge_method")).toBe("S256");
  });

  it("carries the CSRF state", () => {
    expect(build().searchParams.get("state")).toBe("state-token");
  });

  it("requests calendar and mail, both read-only", () => {
    const scopes = (build().searchParams.get("scope") ?? "").split(" ");
    expect(scopes).toContain(
      "https://www.googleapis.com/auth/calendar.readonly",
    );
    expect(scopes).toContain("https://www.googleapis.com/auth/gmail.readonly");
  });

  it("never requests a scope that could modify a calendar or a mailbox", () => {
    // The read-only variants end in `.readonly`; the bare and `.events` /
    // `.send` / `.modify` forms all grant writes.
    const scopes = (build().searchParams.get("scope") ?? "").split(" ");
    const writeScopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://mail.google.com/",
    ];
    for (const scope of writeScopes) {
      expect(scopes).not.toContain(scope);
    }
  });

  it("never puts the client secret in a browser-visible URL", () => {
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "super-secret");
    expect(build().toString()).not.toContain("super-secret");
  });
});
