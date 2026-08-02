"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";
import { fetchData } from "@/lib/client/fetch-json";
import { formatRelativeDate } from "@/lib/format";
import type { CalendarConnectionSummary, CalendarSyncResult } from "@/types";

interface IntegrationsPayload {
  google: {
    available: boolean;
    reason:
      | "demo-mode"
      | "not-configured"
      | "encryption-key-missing"
      | null;
    connection: CalendarConnectionSummary | null;
  };
}

/** Statuses the OAuth callback appends to the dashboard URL. */
const CALLBACK_MESSAGES: Record<string, string> = {
  connected: "Calendar connected. Sync to import your upcoming meetings.",
  "connected-no-refresh":
    "Calendar connected, but Google did not return a refresh token. Disconnect and reconnect if syncing stops working.",
  denied: "Consent was cancelled, so no calendar was connected.",
  "state-mismatch":
    "That sign-in response could not be verified. Please start the connection again.",
  "invalid-response": "Google's response was incomplete. Please try again.",
  "exchange-failed": "Google rejected the connection. Please try again.",
  "demo-mode": "Demo mode uses synthetic meetings.",
};

const UNAVAILABLE_REASONS: Record<string, string> = {
  "demo-mode":
    "This deployment runs on synthetic meetings. Calendar syncing is available in persistent mode.",
  "not-configured":
    "Google Calendar is not configured on this deployment (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
  "encryption-key-missing":
    "TOKEN_ENCRYPTION_KEY is not set, so access tokens cannot be stored safely.",
};

export function CalendarConnectionCard({
  onSynced,
}: {
  onSynced?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<IntegrationsPayload["google"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const callbackStatus = searchParams.get("calendar");
  // Captured once on mount so the message survives clearing the query
  // parameter below, without assigning state from inside an effect.
  const [callbackNotice] = useState(() =>
    callbackStatus ? (CALLBACK_MESSAGES[callbackStatus] ?? "") : "",
  );

  const load = useCallback(async () => {
    try {
      const response = await fetchData<IntegrationsPayload>("/api/integrations");
      setState(response.data.google);
    } catch {
      // A failure here should not take the dashboard down with it; the card
      // simply stays hidden.
      setState(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    // Drop the query parameter so a refresh does not replay the message. The
    // text itself was captured at mount, so nothing is lost.
    if (callbackStatus) router.replace("/dashboard");
  }, [callbackStatus, router]);

  async function handleSync() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetchData<CalendarSyncResult>(
        "/api/integrations/google/sync",
        { method: "POST" },
      );
      const { imported, updated } = response.data;
      setNotice(
        imported === 0 && updated === 0
          ? "No upcoming events found in the next two weeks."
          : `Imported ${imported} and refreshed ${updated} meeting${
              imported + updated === 1 ? "" : "s"
            }.`,
      );
      await load();
      onSynced?.();
    } catch (syncError) {
      setError(
        syncError instanceof Error ? syncError.message : "Sync failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fetchData("/api/integrations/google/disconnect", { method: "POST" });
      setNotice("Calendar disconnected. Imported meetings were kept.");
      await load();
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Disconnect failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  // Hidden entirely in demo mode — there is nothing useful to offer there.
  if (!state || state.reason === "demo-mode") return null;

  const { available, reason, connection } = state;

  return (
    <section aria-labelledby="calendar-heading" className="mb-8">
      <h2 id="calendar-heading" className="sr-only">
        Calendar connection
      </h2>
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-ink/5 text-ink/60">
            <Icon name="calendar" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-semibold">
              Google Calendar
            </p>
            {connection ? (
              <p className="mt-1 text-sm leading-6 text-ink/60">
                Connected as{" "}
                <span className="font-medium text-ink/80">
                  {connection.accountEmail}
                </span>
                {connection.lastSyncedAt ? (
                  <> · last synced {formatRelativeDate(connection.lastSyncedAt)}</>
                ) : (
                  <> · not synced yet</>
                )}
              </p>
            ) : (
              <p className="mt-1 max-w-xl text-sm leading-6 text-ink/60">
                {available
                  ? "Import your upcoming events as meetings. Read-only: ContextFlow never writes to your calendar."
                  : UNAVAILABLE_REASONS[reason ?? ""] ??
                    "Calendar syncing is unavailable on this deployment."}
              </p>
            )}
            {connection?.lastSyncError ? (
              <p className="mt-1.5 text-sm text-coral">
                Last sync failed: {connection.lastSyncError}
              </p>
            ) : null}
          </div>
        </div>

        {available ? (
          <div className="flex shrink-0 items-center gap-2">
            {connection ? (
              <>
                <button
                  type="button"
                  className="button-primary"
                  onClick={handleSync}
                  disabled={busy}
                >
                  {busy ? "Working…" : "Sync now"}
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={handleDisconnect}
                  disabled={busy}
                >
                  Disconnect
                </button>
              </>
            ) : (
              // A plain link, not fetch: the endpoint issues a redirect to
              // Google's consent screen and the browser must follow it.
              <a className="button-primary" href="/api/integrations/google/start">
                Connect calendar
                <Icon name="arrow" className="size-4" />
              </a>
            )}
          </div>
        ) : null}
      </div>

      {notice || callbackNotice ? (
        <p role="status" className="mt-2.5 text-sm text-ink/65">
          {notice || callbackNotice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2.5 text-sm text-coral">
          {error}
        </p>
      ) : null}
    </section>
  );
}
