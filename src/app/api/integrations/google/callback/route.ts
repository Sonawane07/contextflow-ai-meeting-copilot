import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { safeEqual } from "@/lib/crypto/tokens";
import { getGoogleRedirectUri } from "@/lib/integrations/google/config";
import {
  exchangeCodeForTokens,
  fetchAccountEmail,
} from "@/lib/integrations/google/oauth";
import { saveConnection } from "@/lib/integrations/google/connection-store";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "@/app/api/integrations/google/start/route";
import { isDemoMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Completes the Google consent flow.
 *
 * Every exit path is a redirect back to the dashboard carrying a short status
 * code, because the user arrives here by browser navigation and would
 * otherwise be shown raw JSON. Nothing from Google's error response is echoed
 * into the URL.
 */
function backToDashboard(request: Request, status: string) {
  const url = new URL("/dashboard", request.url);
  url.searchParams.set("calendar", status);
  return NextResponse.redirect(url);
}

async function clearFlowCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(OAUTH_STATE_COOKIE);
  cookieStore.delete(OAUTH_VERIFIER_COOKIE);
}

export async function GET(request: Request) {
  if (isDemoMode()) {
    return backToDashboard(request, "demo-mode");
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/dashboard", request.url));
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  // The user pressed Cancel on Google's consent screen.
  if (params.get("error")) {
    await clearFlowCookies();
    return backToDashboard(request, "denied");
  }

  const code = params.get("code");
  const state = params.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = cookieStore.get(OAUTH_VERIFIER_COOKIE)?.value;

  await clearFlowCookies();

  if (!code || !state || !expectedState || !verifier) {
    return backToDashboard(request, "invalid-response");
  }

  // Constant-time, and a mismatch means this callback did not originate from
  // a consent flow this browser started.
  if (!safeEqual(state, expectedState)) {
    return backToDashboard(request, "state-mismatch");
  }

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      redirectUri: getGoogleRedirectUri(url.origin),
      codeVerifier: verifier,
    });

    const accountEmail = await fetchAccountEmail(tokens.accessToken);
    const supabase = await createSupabaseServerClient();
    await saveConnection(supabase, user.id, { tokens, accountEmail });

    return backToDashboard(
      request,
      tokens.refreshToken ? "connected" : "connected-no-refresh",
    );
  } catch {
    return backToDashboard(request, "exchange-failed");
  }
}
