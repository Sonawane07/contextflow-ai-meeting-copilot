/**
 * Google OAuth configuration.
 *
 * Read-only calendar access plus the user's email address, which is the
 * narrowest pair that still lets the UI say *which* account is connected.
 * `calendar.readonly` is a sensitive scope: Google requires verification to
 * publish an app that requests it, but an app left in Testing status may add
 * up to 100 test users without any review.
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

/**
 * The scope the feature cannot work without.
 *
 * Google presents sensitive scopes as individually declinable checkboxes, so a
 * user can complete consent having granted only `openid`/`userinfo.email`. That
 * yields a perfectly valid token which then fails every Calendar call with a
 * 403 — checking the granted scope up front turns that into an actionable
 * message at connect time.
 */
export const REQUIRED_GOOGLE_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

export function hasCalendarScope(grantedScope: string): boolean {
  return grantedScope.split(/\s+/).includes(REQUIRED_GOOGLE_SCOPE);
}

export const GOOGLE_AUTH_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_CALENDAR_EVENTS_ENDPOINT =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
export const GOOGLE_USERINFO_ENDPOINT =
  "https://www.googleapis.com/oauth2/v2/userinfo";

export function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID ?? "";
}

export function getGoogleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET ?? "";
}

/**
 * Google matches redirect URIs exactly, so this is configured rather than
 * derived: the value here must be registered verbatim in the Cloud console.
 * The request origin is only a development convenience when the variable is
 * unset.
 */
export function getGoogleRedirectUri(requestOrigin?: string): string {
  const configured = process.env.GOOGLE_REDIRECT_URI;
  if (configured && configured.length > 0) return configured;
  if (requestOrigin) return `${requestOrigin}/api/integrations/google/callback`;
  return "http://localhost:3000/api/integrations/google/callback";
}

export function isGoogleCalendarConfigured(): boolean {
  return getGoogleClientId().length > 0 && getGoogleClientSecret().length > 0;
}
