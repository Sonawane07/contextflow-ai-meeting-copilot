"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { fetchData } from "@/lib/client/fetch-json";
import { formatRelativeDate } from "@/lib/format";
import type {
  JobInboxScanSummary,
  TrackedEmail,
  TrackedEmailCategory,
} from "@/types";

const CATEGORY_LABEL: Record<TrackedEmailCategory, string> = {
  interview_invite: "Interview",
  assessment: "Assessment",
  offer: "Offer",
  rejection: "Rejection",
  reply_needed: "Reply needed",
  acknowledgement: "Acknowledged",
  other: "Job-related",
};

/** Only categories that imply action get a colour; the rest stay quiet. */
const CATEGORY_TONE: Partial<Record<TrackedEmailCategory, string>> = {
  interview_invite: "bg-mint/45 text-ink",
  assessment: "bg-sky/60 text-ink",
  offer: "bg-mint/70 text-ink",
  reply_needed: "bg-peach text-ink",
  rejection: "bg-ink/8 text-ink/55",
  acknowledgement: "bg-ink/8 text-ink/55",
};

export function JobInboxPanel() {
  const [emails, setEmails] = useState<TrackedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetchData<TrackedEmail[]>("/api/inbox");
      setEmails(response.data);
    } catch {
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const needingReply = useMemo(
    () => emails.filter((e) => e.needsReply),
    [emails],
  );

  async function handleScan() {
    setScanning(true);
    setError("");
    setNotice("");
    try {
      const response = await fetchData<JobInboxScanSummary>("/api/inbox/scan", {
        method: "POST",
      });
      const { scanned, needingReply: count } = response.data;
      setNotice(
        scanned === 0
          ? "No job-related mail found in the last 30 days."
          : `Checked ${scanned} message${scanned === 1 ? "" : "s"}. ${count} need${count === 1 ? "s" : ""} a reply.`,
      );
      await load();
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }

  async function handleDismiss(id: string) {
    setBusyId(id);
    try {
      await fetchData(`/api/inbox/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: true }),
      });
      setEmails((current) => current.filter((e) => e.id !== id));
    } catch (dismissError) {
      setError(
        dismissError instanceof Error ? dismissError.message : "Update failed.",
      );
    } finally {
      setBusyId("");
    }
  }

  // Hidden until there is something to say — an empty panel on every dashboard
  // would just be furniture.
  if (loading || (emails.length === 0 && !notice && !error)) return null;

  return (
    <section aria-labelledby="inbox-heading" className="mb-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="eyebrow">Job search</p>
          <h2
            id="inbox-heading"
            className="mt-1 font-display text-xl font-semibold tracking-[-0.03em]"
          >
            {needingReply.length > 0
              ? `${needingReply.length} email${needingReply.length === 1 ? "" : "s"} waiting on you`
              : "Nothing waiting on you"}
          </h2>
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? "Checking…" : "Check inbox"}
        </button>
      </div>

      {emails.length > 0 ? (
        <ul className="card divide-y divide-ink/8 overflow-hidden">
          {emails.map((email) => (
            <li key={email.id} className="flex items-start gap-3 p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] ${
                      CATEGORY_TONE[email.category] ?? "bg-ink/8 text-ink/55"
                    }`}
                  >
                    {CATEGORY_LABEL[email.category]}
                  </span>
                  {email.isUnread ? (
                    <span className="rounded-full bg-coral/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-coral">
                      Unread
                    </span>
                  ) : null}
                  {email.deadlineAt ? (
                    <span className="text-xs font-semibold text-coral">
                      by {formatRelativeDate(email.deadlineAt)}
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 truncate font-semibold">{email.subject}</p>
                <p className="mt-0.5 truncate text-sm text-ink/55">
                  {email.from} · {formatRelativeDate(email.receivedAt)}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-ink/65">
                  {email.reason}
                </p>
              </div>

              <button
                type="button"
                className="button-secondary shrink-0 px-3 py-1.5 text-xs"
                onClick={() => handleDismiss(email.id)}
                disabled={busyId === email.id}
                aria-label={`Mark "${email.subject}" as handled`}
              >
                {busyId === email.id ? "…" : "Handled"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {notice ? (
        <p role="status" className="mt-2.5 text-sm text-ink/65">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2.5 text-sm text-coral">
          {error}
        </p>
      ) : null}

      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ink/45">
        <Icon name="mail" className="size-3.5" />
        Read-only. ContextFlow never sends, replies, or marks anything read.
      </p>
    </section>
  );
}
