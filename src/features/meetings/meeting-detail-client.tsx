"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { ErrorState } from "@/components/states";
import { ActionCard } from "@/features/actions/action-card";
import { fetchData } from "@/lib/client/fetch-json";
import { formatMeetingTime, formatRelativeDate } from "@/lib/format";
import type {
  ActionStatus,
  AuditLog,
  ContextItemType,
  FollowUpAction,
  Meeting,
  MeetingBrief,
} from "@/types";

const contextIcons: Record<ContextItemType, IconName> = {
  email: "mail",
  note: "note",
  calendar: "calendar",
};

export function MeetingDetailClient({ meetingId }: { meetingId: string }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [actions, setActions] = useState<FollowUpAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [meetingResponse, actionResponse] = await Promise.all([
        fetchData<Meeting>(`/api/meetings/${meetingId}`),
        fetchData<FollowUpAction[]>("/api/actions"),
      ]);
      setMeeting(meetingResponse.data);
      setActions(
        actionResponse.data.filter(
          (action) => action.meetingId === meetingId,
        ),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The meeting could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const stats = useMemo(() => {
    if (!meeting) return [];
    return [
      {
        icon: "users" as const,
        value: meeting.attendees.length,
        label: "attendees",
      },
      {
        icon: "document" as const,
        value: meeting.contextItems.length,
        label: "context signals",
      },
      {
        icon: "task" as const,
        value: meeting.actionItems.filter((item) => !item.completed).length,
        label: "open items",
      },
    ];
  }, [meeting]);

  async function generateBrief() {
    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetchData<{
        brief: MeetingBrief;
        actions: FollowUpAction[];
      }>(`/api/meetings/${meetingId}/brief`, { method: "POST" });
      setMeeting((current) =>
        current ? { ...current, brief: response.data.brief } : current,
      );
      setActions(response.data.actions);
      setNotice(
        `Brief generated with the ${response.meta?.provider ?? "mock"} provider. Proposed actions are waiting for your decision.`,
      );
      window.setTimeout(() => {
        document
          .getElementById("meeting-brief")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "The brief could not be generated.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function decide(
    id: string,
    status: Exclude<ActionStatus, "pending">,
  ) {
    setBusyId(id);
    setError("");
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
        `${response.data.action.title} was ${status} and added to the audit log.`,
      );
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "The action could not be updated.",
      );
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return (
      <div aria-label="Loading meeting" className="animate-pulse">
        <div className="h-4 w-28 rounded bg-ink/8" />
        <div className="mt-8 h-12 w-3/5 rounded bg-ink/8" />
        <div className="mt-4 h-5 w-2/5 rounded bg-ink/6" />
        <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <div className="h-80 rounded-2xl bg-white/70" />
          <div className="h-80 rounded-2xl bg-white/70" />
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div>
        <Link href="/dashboard" className="button-secondary mb-6">
          ← Dashboard
        </Link>
        <ErrorState message={error || "Meeting not found."} onRetry={load} />
      </div>
    );
  }

  return (
    <>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-xs font-bold text-ink/45 hover:text-ink"
      >
        <span aria-hidden="true">←</span>
        Back to dashboard
      </Link>

      <div className="mt-6 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
        <div>
          <p className="eyebrow">Upcoming meeting</p>
          <h1 className="mt-2 max-w-4xl font-display text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            {meeting.title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink/50">
            <span className="inline-flex items-center gap-2">
              <Icon name="clock" className="size-4 text-coral" />
              {formatMeetingTime(meeting.startsAt, meeting.endsAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon name="calendar" className="size-4 text-coral" />
              {meeting.location}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-coral px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(237,115,90,0.25)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0"
          onClick={generateBrief}
          disabled={generating}
        >
          <Icon name="sparkles" className="size-[18px]" />
          {generating
            ? "Generating brief…"
            : meeting.brief
              ? "Regenerate meeting brief"
              : "Generate meeting brief"}
        </button>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-xl">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white/65 p-3 sm:p-4">
            <Icon name={stat.icon} className="size-4 text-ink/40" />
            <p className="mt-3 font-display text-2xl font-semibold">
              {stat.value}
            </p>
            <p className="text-[11px] font-semibold text-ink/42">{stat.label}</p>
          </div>
        ))}
      </div>

      {notice ? (
        <div
          role="status"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <Icon name="check" className="mt-0.5 size-4 shrink-0" />
          {notice}
        </div>
      ) : null}
      {error ? <div className="mt-6"><ErrorState message={error} /></div> : null}

      <div className="mt-10 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section aria-labelledby="context-heading" className="card p-5 sm:p-7">
          <p className="eyebrow">Focused inputs</p>
          <h2
            id="context-heading"
            className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.035em]"
          >
            Related context
          </h2>
          <div className="mt-6 divide-y divide-ink/8">
            {meeting.contextItems.map((item) => (
              <article key={item.id} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper">
                  <Icon name={contextIcons[item.type]} className="size-[18px]" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold">{item.title}</h3>
                    <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink/45">
                      {item.type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink/58">{item.body}</p>
                  <p className="mt-2 text-[11px] font-medium text-ink/35">
                    {item.sourceLabel} · {formatRelativeDate(item.occurredAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="space-y-5">
          <section aria-labelledby="attendees-heading" className="card p-5 sm:p-6">
            <p className="eyebrow">In the room</p>
            <h2
              id="attendees-heading"
              className="mt-1.5 font-display text-xl font-semibold"
            >
              Attendees
            </h2>
            <div className="mt-5 space-y-4">
              {meeting.attendees.map((attendee, index) => (
                <div key={attendee.email} className="flex items-center gap-3">
                  <span
                    className={`grid size-9 place-items-center rounded-full text-[10px] font-bold ${
                      ["bg-peach", "bg-sky", "bg-lilac", "bg-mint"][index % 4]
                    }`}
                  >
                    {attendee.initials}
                  </span>
                  <div>
                    <p className="text-sm font-bold">{attendee.name}</p>
                    <p className="mt-0.5 text-xs text-ink/40">{attendee.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="open-items-heading" className="card p-5 sm:p-6">
            <p className="eyebrow">Carry-over</p>
            <h2
              id="open-items-heading"
              className="mt-1.5 font-display text-xl font-semibold"
            >
              Existing action items
            </h2>
            <div className="mt-5 space-y-3">
              {meeting.actionItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${
                      item.completed
                        ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                        : "border-ink/15 bg-white text-transparent"
                    }`}
                  >
                    <Icon name="check" className="size-3" />
                  </span>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        item.completed ? "text-ink/40 line-through" : ""
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink/38">
                      {item.owner}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {meeting.brief ? (
        <section
          id="meeting-brief"
          aria-labelledby="brief-heading"
          className="mt-12 scroll-mt-28"
        >
          <div className="overflow-hidden rounded-[24px] bg-ink text-white">
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:p-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-mint">
                  Generated meeting brief
                </p>
                <h2
                  id="brief-heading"
                  className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em]"
                >
                  The signal, before the conversation.
                </h2>
              </div>
              <span className="text-xs font-medium text-white/40">
                {meeting.brief.provider} ·{" "}
                {formatRelativeDate(meeting.brief.generatedAt)}
              </span>
            </div>

            <div className="grid gap-px bg-white/10 lg:grid-cols-2">
              <div className="bg-ink p-6 sm:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                  Objective
                </p>
                <p className="mt-3 font-display text-xl leading-8 text-white/92">
                  {meeting.brief.objective}
                </p>
              </div>
              <div className="bg-ink p-6 sm:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                  Context summary
                </p>
                <p className="mt-3 text-sm leading-6 text-white/67">
                  {meeting.brief.contextSummary}
                </p>
              </div>
              <div className="bg-ink p-6 sm:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                  Unresolved questions
                </p>
                <ol className="mt-4 space-y-3">
                  {meeting.brief.unresolvedQuestions.map((question, index) => (
                    <li key={question} className="flex gap-3 text-sm text-white/72">
                      <span className="font-mono text-xs text-mint">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="bg-ink p-6 sm:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                  Suggested agenda
                </p>
                <ol className="mt-4 space-y-3">
                  {meeting.brief.suggestedAgenda.map((item, index) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-white/72">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/8 font-mono text-[10px]">
                        {index + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-4">
              <p className="eyebrow">Approval required</p>
              <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.035em]">
                Proposed follow-up actions
              </h2>
              <p className="mt-2 text-sm text-ink/50">
                These suggestions remain simulated until you make a decision.
              </p>
            </div>
            <div className="space-y-3">
              {actions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  busy={busyId === action.id}
                  onDecision={decide}
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-12 rounded-[24px] border border-dashed border-ink/18 bg-white/45 p-8 text-center sm:p-12">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-coral text-white">
            <Icon name="sparkles" className="size-5" />
          </span>
          <h2 className="mt-5 font-display text-2xl font-semibold tracking-[-0.035em]">
            Your brief is one review away.
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink/52">
            Generate a deterministic brief from the focused context above. No
            external account or AI key is used in demo mode.
          </p>
          <button
            type="button"
            className="button-primary mt-6"
            onClick={generateBrief}
            disabled={generating}
          >
            <Icon name="sparkles" className="size-4" />
            {generating ? "Generating…" : "Generate meeting brief"}
          </button>
        </section>
      )}
    </>
  );
}
