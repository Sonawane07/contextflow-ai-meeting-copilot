import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { failure } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth/session";
import { isTokenEncryptionConfigured } from "@/lib/crypto/tokens";
import {
  getGoogleRedirectUri,
  isGoogleCalendarConfigured,
} from "@/lib/integrations/google/config";
import {
  buildAuthorizationUrl,
  createPkcePair,
  createStateToken,
} from "@/lib/integrations/google/oauth";
import { isDemoMode } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export const OAUTH_STATE_COOKIE = "cf_google_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "cf_google_oauth_verifier";

/**
 * Begins the Google consent flow.
 *
 * The CSRF `state` and the PKCE verifier are held in short-lived httpOnly
 * cookies rather than server-side session storage: they only need to survive
 * the round trip to Google, and the callback is the sole reader.
 */
export async function GET(request: Request) {
  if (isDemoMode()) {
    return failure(
      400,
      "DEMO_MODE_ACTIVE",
      "Demo mode uses synthetic meetings; connect a calendar in persistent mode.",
    );
  }

  const user = await getSessionUser();
  if (!user) {
    // A browser navigation, so send the user to sign in rather than returning
    // JSON they would never see.
    return NextResponse.redirect(new URL("/login?next=/dashboard", request.url));
  }

  if (!isGoogleCalendarConfigured()) {
    return failure(
      503,
      "GOOGLE_NOT_CONFIGURED",
      "Google Calendar is not configured on this deployment.",
    );
  }
  if (!isTokenEncryptionConfigured()) {
    // Refusing here is deliberate: without the key the callback would have to
    // store the refresh token in plaintext.
    return failure(
      503,
      "TOKEN_ENCRYPTION_UNAVAILABLE",
      "TOKEN_ENCRYPTION_KEY is not set, so tokens cannot be stored safely.",
    );
  }

  const state = createStateToken();
  const { verifier, challenge } = createPkcePair();
  const redirectUri = getGoogleRedirectUri(new URL(request.url).origin);

  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Google returns the user by top-level GET navigation, which `strict`
    // would strip the cookie from.
    sameSite: "lax" as const,
    path: "/api/integrations/google",
    maxAge: 600,
  };
  cookieStore.set(OAUTH_STATE_COOKIE, state, options);
  cookieStore.set(OAUTH_VERIFIER_COOKIE, verifier, options);

  return NextResponse.redirect(
    buildAuthorizationUrl({ redirectUri, state, codeChallenge: challenge }),
  );
}
