"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ActionCard } from "@/features/actions/action-card";
import { EmptyState, ErrorState, LoadingCards } from "@/components/states";
import { fetchData } from "@/lib/client/fetch-json";
import type {
  ActionStatus,
  AuditLog,
  FollowUpAction,
} from "@/types";

const filters: { label: string; value: ActionStatus }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export function ActionCenterClient() {
  const [actions, setActions] = useState<FollowUpAction[]>([]);
  const [filter, setFilter] = useState<ActionStatus>("pending");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchData<FollowUpAction[]>("/api/actions");
      setActions(response.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Actions could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visible = useMemo(
    () => actions.filter((action) => action.status === filter),
    [actions, filter],
  );

  async function decide(
    id: string,
    status: Exclude<ActionStatus, "pending">,
  ) {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetchData<{
        action: FollowUpAction;
        auditLog: AuditLog;
      }>(`/api/actions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setActions((current) =>
        current.map((action) =>
          action.id === id ? response.data.action : action,
        ),
      );
      setNotice(
        `${response.data.action.title} was ${status}. The decision is now in the audit log.`,
      );
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "The decision could not be saved.",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Human-in-the-loop controls"
        title="Action center"
        description="AI can propose a next step. Only you can decide whether it belongs in the workflow."
        actions={
          <div className="rounded-xl border border-ink/8 bg-white px-4 py-3 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/38">
              Awaiting review
            </p>
            <p className="mt-0.5 font-display text-2xl font-semibold">
              {actions.filter((action) => action.status === "pending").length}
            </p>
          </div>
        }
      />

      <div
        className="mb-6 flex max-w-lg rounded-xl border border-ink/8 bg-white/65 p-1"
        role="tablist"
        aria-label="Action status"
      >
        {filters.map((item) => {
          const count = actions.filter(
            (action) => action.status === item.value,
          ).length;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-colors ${
                filter === item.value
                  ? "bg-ink text-white shadow-sm"
                  : "text-ink/48 hover:text-ink"
              }`}
            >
              {item.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  filter === item.value ? "bg-white/12" : "bg-ink/6"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {notice ? (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <Icon name="check" className="mt-0.5 size-4 shrink-0" />
          {notice}
        </div>
      ) : null}
      {error ? <div className="mb-5"><ErrorState message={error} /></div> : null}

      {loading ? (
        <LoadingCards count={2} />
      ) : visible.length ? (
        <div className="space-y-3">
          {visible.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              busy={busyId === action.id}
              onDecision={decide}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No ${filter} actions`}
          description={
            filter === "pending"
              ? "You are caught up. New suggestions will remain here until you make a decision."
              : `Actions you mark ${filter} will appear in this view.`
          }
        />
      )}

      <aside className="mt-8 flex items-start gap-3 rounded-2xl bg-ink p-5 text-white">
        <Icon name="sparkles" className="mt-0.5 size-5 shrink-0 text-mint" />
        <div>
          <p className="text-sm font-bold">Approval changes state, not the outside world.</p>
          <p className="mt-1 text-xs leading-5 text-white/58">
            Demo actions are simulated. No email is sent, task created, or
            meeting scheduled.
          </p>
        </div>
      </aside>
    </>
  );
}
