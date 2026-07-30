"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState } from "@/components/states";
import { StatusPill } from "@/components/status-pill";
import { fetchData } from "@/lib/client/fetch-json";
import { formatMeetingTime } from "@/lib/format";
import type { AuditLog } from "@/types";

export function AuditLogClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchData<AuditLog[]>("/api/audit-logs");
      setLogs(response.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Audit records could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <>
      <PageHeader
        eyebrow="Decision history"
        title="Audit log"
        description="A simple, inspectable record of who approved or rejected each proposed follow-up."
      />

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {loading ? (
        <div className="card overflow-hidden" aria-label="Loading audit log">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="flex animate-pulse gap-4 border-b border-ink/8 p-5 last:border-0"
            >
              <div className="size-10 rounded-xl bg-ink/7" />
              <div className="flex-1">
                <div className="h-4 w-1/3 rounded bg-ink/8" />
                <div className="mt-3 h-3 w-2/3 rounded bg-ink/6" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length ? (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1.3fr_.8fr_.65fr_.8fr] gap-4 border-b border-ink/8 bg-white/45 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.13em] text-ink/38 md:grid">
            <span>Action</span>
            <span>Meeting</span>
            <span>Actor</span>
            <span>Decision time</span>
          </div>
          <div className="divide-y divide-ink/8">
            {logs.map((log) => (
              <article
                key={log.id}
                className="grid gap-4 p-5 md:grid-cols-[1.3fr_.8fr_.65fr_.8fr] md:items-center"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                      log.status === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    <Icon
                      name={log.status === "approved" ? "check" : "x"}
                      className="size-4"
                    />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{log.actionTitle}</p>
                    <div className="mt-1.5">
                      <StatusPill status={log.status} />
                    </div>
                  </div>
                </div>
                <Link
                  href={`/meetings/${log.meetingId}`}
                  className="text-sm font-semibold text-ink/58 hover:text-ink"
                >
                  {log.meetingTitle}
                </Link>
                <p className="text-sm text-ink/58">{log.actor}</p>
                <time
                  dateTime={log.timestamp}
                  className="text-xs font-medium text-ink/42"
                >
                  {formatMeetingTime(log.timestamp)}
                </time>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No decisions recorded"
          description="Approve or reject a proposed action to create the first audit entry."
        />
      )}
    </>
  );
}
