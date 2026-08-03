import "server-only";

import { decryptToken, encryptToken } from "@/lib/crypto/tokens";
import { hasGmailScope } from "@/lib/integrations/google/config";
import {
  GoogleOAuthError,
  refreshAccessToken,
  revokeToken,
  type GoogleTokens,
} from "@/lib/integrations/google/oauth";
import { RepositoryError } from "@/lib/supabase/repositories";
import type { ContextFlowSupabaseClient } from "@/lib/supabase/server";
import type { CalendarConnectionSummary } from "@/types";

/**
 * Persistence for a user's Google connection.
 *
 * Tokens are encrypted on the way in and decrypted only where they are about
 * to be used, so the plaintext never sits in a variable longer than a request.
 * Nothing here returns a raw token to a caller outside this module except
 * `getValidAccessToken`, which exists precisely for that.
 */

const CONNECTION_COLUMNS =
  "provider, account_email, access_token_expires_at, scope, last_synced_at, last_sync_error";

export function toConnectionSummary(row: {
  provider: "google";
  account_email: string;
  access_token_expires_at: string;
  scope: string;
  last_synced_at: string | null;
  last_sync_error: string | null;
}): CalendarConnectionSummary {
  return {
    provider: row.provider,
    accountEmail: row.account_email,
    expiresAt: row.access_token_expires_at,
    lastSyncedAt: row.last_synced_at ?? undefined,
    lastSyncError: row.last_sync_error ?? undefined,
    scope: row.scope,
    // Surfaced so a declined Gmail checkbox is visible in the UI rather than
    // showing up later as briefs that mysteriously have no email context.
    gmailEnabled: hasGmailScope(row.scope),
  };
}

export async function getConnectionSummary(
  client: ContextFlowSupabaseClient,
  userId: string,
): Promise<CalendarConnectionSummary | null> {
  const { data, error } = await client
    .from("calendar_connections")
    .select(CONNECTION_COLUMNS)
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (error) {
    throw new RepositoryError("The calendar connection could not be read.", error);
  }
  return data ? toConnectionSummary(data) : null;
}

export async function saveConnection(
  client: ContextFlowSupabaseClient,
  userId: string,
  options: { tokens: GoogleTokens; accountEmail: string },
): Promise<void> {
  const { tokens, accountEmail } = options;

  const row: Record<string, unknown> = {
    user_id: userId,
    provider: "google" as const,
    account_email: accountEmail,
    access_token_encrypted: encryptToken(tokens.accessToken),
    access_token_expires_at: tokens.expiresAt.toISOString(),
    scope: tokens.scope,
    last_sync_error: null,
    updated_at: new Date().toISOString(),
  };

  // Only overwrite the stored refresh token when Google actually issued one.
  // A re-consent that omits it must not wipe the token we already hold.
  if (tokens.refreshToken) {
    row.refresh_token_encrypted = encryptToken(tokens.refreshToken);
  }

  const { error } = await client
    .from("calendar_connections")
    .upsert(row as never, { onConflict: "user_id,provider" });

  if (error) {
    throw new RepositoryError("The calendar connection could not be saved.", error);
  }
}

export async function recordSyncResult(
  client: ContextFlowSupabaseClient,
  userId: string,
  result: { syncedAt: Date; error?: string },
): Promise<void> {
  await client
    .from("calendar_connections")
    .update({
      last_synced_at: result.syncedAt.toISOString(),
      last_sync_error: result.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "google");
}

/**
 * Deletes the connection, revoking at Google first.
 *
 * Revocation is best-effort: an expired or already-revoked token returns an
 * error, and refusing to delete the row in that case would leave the user
 * unable to disconnect.
 */
export async function deleteConnection(
  client: ContextFlowSupabaseClient,
  userId: string,
): Promise<{ revoked: boolean }> {
  const { data } = await client
    .from("calendar_connections")
    .select("refresh_token_encrypted, access_token_encrypted")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  let revoked = false;
  if (data) {
    const stored = data.refresh_token_encrypted ?? data.access_token_encrypted;
    try {
      revoked = await revokeToken(decryptToken(stored));
    } catch {
      // A token we can no longer decrypt cannot be revoked; deleting the row
      // is still the right outcome.
      revoked = false;
    }
  }

  const { error } = await client
    .from("calendar_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "google");

  if (error) {
    throw new RepositoryError("The calendar connection could not be removed.", error);
  }
  return { revoked };
}

/**
 * Returns a usable access token, refreshing it when it has expired.
 *
 * Returns null when there is no connection at all. Throws when a connection
 * exists but cannot be renewed — most often because Google expired the refresh
 * token, which it does after seven days while the OAuth app is in Testing
 * status. That case needs the user to reconnect, so it must not be silent.
 */
export async function getValidAccessToken(
  client: ContextFlowSupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("calendar_connections")
    .select(
      "access_token_encrypted, refresh_token_encrypted, access_token_expires_at, account_email",
    )
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (error) {
    throw new RepositoryError("The calendar connection could not be read.", error);
  }
  if (!data) return null;

  if (new Date(data.access_token_expires_at) > new Date()) {
    return decryptToken(data.access_token_encrypted);
  }

  if (!data.refresh_token_encrypted) {
    throw new GoogleOAuthError(
      "The Google connection has expired and has no refresh token. Reconnect the calendar.",
    );
  }

  const refreshed = await refreshAccessToken(
    decryptToken(data.refresh_token_encrypted),
  );
  await saveConnection(client, userId, {
    tokens: refreshed,
    accountEmail: data.account_email,
  });
  return refreshed.accessToken;
}
