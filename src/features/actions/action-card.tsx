import { Icon } from "@/components/icons";
import { StatusPill } from "@/components/status-pill";
import { actionTypeLabel, formatRelativeDate } from "@/lib/format";
import type { ActionStatus, FollowUpAction } from "@/types";

export function ActionCard({
  action,
  busy,
  onDecision,
  compact = false,
}: {
  action: FollowUpAction;
  busy?: boolean;
  onDecision?: (
    id: string,
    status: Exclude<ActionStatus, "pending">,
  ) => void;
  compact?: boolean;
}) {
  const icon =
    action.type === "draft_email"
      ? "mail"
      : action.type === "create_task"
        ? "task"
        : "calendar";

  return (
    <article className={`card ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-white">
            <Icon name={icon} className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/42">
                {actionTypeLabel(action.type)}
              </p>
              <StatusPill status={action.status} />
            </div>
            <h3 className="mt-2 font-display text-lg font-semibold tracking-[-0.025em]">
              {action.title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-ink/56">
              {action.description}
            </p>
            <p className="mt-3 text-xs font-medium text-ink/38">
              {action.meetingTitle} · {formatRelativeDate(action.createdAt)}
            </p>
          </div>
        </div>
        {action.status === "pending" && onDecision ? (
          <div className="flex shrink-0 gap-2 sm:pl-4">
            <button
              type="button"
              className="button-secondary flex-1 sm:flex-none"
              onClick={() => onDecision(action.id, "rejected")}
              disabled={busy}
              aria-label={`Reject ${action.title}`}
            >
              <Icon name="x" className="size-4" />
              Reject
            </button>
            <button
              type="button"
              className="button-primary flex-1 sm:flex-none"
              onClick={() => onDecision(action.id, "approved")}
              disabled={busy}
              aria-label={`Approve ${action.title}`}
            >
              <Icon name="check" className="size-4" />
              {busy ? "Saving…" : "Approve"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
