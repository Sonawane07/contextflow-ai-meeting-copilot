import "server-only";

import { createHash, randomBytes } from "node:crypto";
import {
  GOOGLE_AUTH_ENDPOINT,
  GOOGLE_REVOKE_ENDPOINT,
  GOOGLE_SCOPES,
  GOOGLE_TOKEN_ENDPOINT,
  GOOGLE_USERINFO_ENDPOINT,
  getGoogleClientId,
  getGoogleClientSecret,
} from "@/lib/integrations/google/config";

export class GoogleOAuthError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "GoogleOAuthError";
  }
}

export interface GoogleTokens {
  accessToken: string;
  /** Absent when Google decides the caller already holds one. */
  refreshToken?: string;
  expiresAt: Date;
  scope: string;
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

/**
 * PKCE, even though this is a confidential client with a secret.
 *
 * The authorization code travels back through the user's browser, so a code
 * intercepted there is useless without the verifier that never left the server.
 * It costs one hash to add.
 */
export function createPkcePair(): PkcePair {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createStateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function buildAuthorizationUrl(options: {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", getGoogleClientId());
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  url.searchParams.set("state", options.state);
  url.searchParams.set("code_challenge", options.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  // `offline` asks for a refresh token; without it the connection would die
  // in an hour and could not be renewed by a background job.
  url.searchParams.set("access_type", "offline");
  // Google returns a refresh token only on the first consent unless it is
  // forced. Without this, reconnecting yields an access token with no way to
  // renew it.
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  return url.toString();
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

function toTokens(payload: TokenResponse): GoogleTokens {
  if (!payload.access_token) {
    throw new GoogleOAuthError("Google did not return an access token.");
  }
  // Expire a minute early so a token never goes stale mid-request.
  const lifetimeSeconds = (payload.expires_in ?? 3600) - 60;
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: new Date(Date.now() + lifetimeSeconds * 1000),
    scope: payload.scope ?? "",
  };
}

async function postToken(body: URLSearchParams): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = (await response.json().catch(() => null)) as
    | TokenResponse
    | null;

  if (!response.ok || !payload || payload.error) {
    // Google's error_description can echo request parameters, so it is logged
    // shape-only rather than surfaced to the caller.
    throw new GoogleOAuthError(
      `Google rejected the token request (${response.status}).`,
      payload?.error,
    );
  }
  return toTokens(payload);
}

export function exchangeCodeForTokens(options: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<GoogleTokens> {
  return postToken(
    new URLSearchParams({
      code: options.code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: options.redirectUri,
      grant_type: "authorization_code",
      code_verifier: options.codeVerifier,
    }),
  );
}

export function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  return postToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      grant_type: "refresh_token",
    }),
  );
}

export async function fetchAccountEmail(accessToken: string): Promise<string> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new GoogleOAuthError(
      `Could not read the Google account email (${response.status}).`,
    );
  }
  const payload = (await response.json()) as { email?: string };
  return payload.email ?? "";
}

/**
 * Best-effort revocation.
 *
 * Disconnecting must delete the local tokens whether or not Google accepts the
 * revoke call — an already-expired token returns 400, and treating that as a
 * failure would strand the row.
 */
export async function revokeToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(GOOGLE_REVOKE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
