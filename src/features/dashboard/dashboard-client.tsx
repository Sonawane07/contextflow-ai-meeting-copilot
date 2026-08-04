"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, LoadingCards } from "@/components/states";
import { ActionCard } from "@/features/actions/action-card";
import { JobInboxPanel } from "@/features/inbox/job-inbox-panel";
import { CalendarConnectionCard } from "@/features/integrations/calendar-connection-card";
import { MeetingCard } from "@/features/meetings/meeting-card";
import { fetchData } from "@/lib/client/fetch-json";
import { formatRelativeDate } from "@/lib/format";
import type { FollowUpAction, Meeting } from "@/types";

export function DashboardClient() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actions, setActions] = useState<FollowUpAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [meetingsResponse, actionsResponse] = await Promise.all([
        fetchData<Meeting[]>("/api/meetings"),
        fetchData<FollowUpAction[]>("/api/actions"),
      ]);
      setMeetings(meetingsResponse.data);
      setActions(actionsResponse.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The dashboard could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pending = useMemo(
    () => actions.filter((action) => action.status === "pending"),
    [actions],
  );
  const recentBriefs = useMemo(
    () => meetings.filter((meeting) => meeting.brief),
    [meetings],
  );

  return (
    <>
      <PageHeader
        eyebrow="Workspace overview"
        title="Good meetings start before the invite."
        description="Review what is coming up, prepare a structured brief, and keep every follow-up action behind an explicit decision."
        actions={
          <Link className="button-primary" href="/actions">
            Review {pending.length} pending
            <Icon name="arrow" className="size-4" />
          </Link>
        }
      />

      <div className="mb-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            value: meetings.length,
            label: "Upcoming meetings",
            color: "bg-sky",
          },
          {
            value: pending.length,
            label: "Pending decisions",
            color: "bg-peach",
          },
          {
            value: recentBriefs.length,
            label: "Briefs ready",
            color: "bg-mint",
          },
          {
            value: actions.filter((action) => action.status !== "pending").length,
            label: "Decisions logged",
            color: "bg-lilac",
          },
        ].map((item) => (
          <div key={item.label} className={`${item.color} rounded-2xl p-4 sm:p-5`}>
            <p className="font-display text-3xl font-semibold tracking-[-0.05em]">
              {loading ? "—" : item.value.toString().padStart(2, "0")}
            </p>
            <p className="mt-1 text-xs font-semibold text-ink/55">{item.label}</p>
          </div>
        ))}
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <CalendarConnectionCard onSynced={load} />

      <JobInboxPanel />

      <section aria-labelledby="upcoming-heading">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow">On your calendar</p>
            <h2
              id="upcoming-heading"
              className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.035em]"
            >
              Upcoming meetings
            </h2>
          </div>
          <p className="hidden text-xs font-semibold text-ink/38 sm:block">
            Synthetic demo schedule
          </p>
        </div>
        {loading ? (
          <LoadingCards />
        ) : meetings.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No upcoming meetings"
            description="When a meeting is available, it will appear here with its focused context."
          />
        )}
      </section>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1.25fr_.75fr]">
        <section aria-labelledby="pending-heading">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow">Human checkpoint</p>
              <h2
                id="pending-heading"
                className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.035em]"
              >
                Pending follow-ups
              </h2>
            </div>
            <Link
              href="/actions"
              className="text-xs font-bold text-ink/48 hover:text-ink"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <LoadingCards count={1} />
          ) : pending.length ? (
            <div className="space-y-3">
              {pending.slice(0, 2).map((action) => (
                <ActionCard key={action.id} action={action} compact />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing waiting"
              description="Generated actions that need your decision will appear here."
            />
          )}
        </section>

        <section aria-labelledby="recent-heading">
          <div className="mb-4">
            <p className="eyebrow">Recently prepared</p>
            <h2
              id="recent-heading"
              className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.035em]"
            >
              Meeting briefs
            </h2>
          </div>
          {loading ? (
            <LoadingCards count={1} />
          ) : recentBriefs.length ? (
            <div className="card divide-y divide-ink/8 overflow-hidden">
              {recentBriefs.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/meetings/${meeting.id}`}
                  className="group flex items-center gap-3 p-4 transition-colors hover:bg-white"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint/35">
                    <Icon name="document" className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {meeting.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink/40">
                      {formatRelativeDate(meeting.brief!.generatedAt)}
                    </span>
                  </span>
                  <Icon
                    name="chevron"
                    className="size-4 text-ink/25 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No briefs yet"
              description="Generate a brief from any meeting to see it here."
            />
          )}
        </section>
      </div>
    </>
  );
}
