import Link from "next/link";
import { Icon } from "@/components/icons";
import { formatMeetingTime } from "@/lib/format";
import type { Meeting } from "@/types";

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  return (
    <article className="card group flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(21,34,28,0.09)]">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-ink/45">
          <Icon name="calendar" className="size-4 text-coral" />
          {formatMeetingTime(meeting.startsAt)}
        </span>
        {meeting.brief ? (
          <span className="rounded-full bg-mint/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink/70">
            Brief ready
          </span>
        ) : null}
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold tracking-[-0.03em]">
        {meeting.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-ink/55">
        {meeting.summary}
      </p>
      <div className="mt-6 flex items-center justify-between border-t border-ink/8 pt-4">
        <div className="flex -space-x-2" aria-label={`${meeting.attendees.length} attendees`}>
          {meeting.attendees.slice(0, 4).map((attendee, index) => (
            <span
              key={attendee.email}
              title={attendee.name}
              className={`grid size-8 place-items-center rounded-full border-2 border-white text-[10px] font-bold ${
                ["bg-peach", "bg-sky", "bg-lilac", "bg-mint"][index]
              }`}
            >
              {attendee.initials}
            </span>
          ))}
        </div>
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-bold text-ink transition-colors group-hover:text-coral"
          href={`/meetings/${meeting.id}`}
        >
          Open meeting
          <Icon name="chevron" className="size-4" />
        </Link>
      </div>
    </article>
  );
}
