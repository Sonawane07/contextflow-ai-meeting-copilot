import type { ActionType } from "@/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function formatMeetingTime(startsAt: string, endsAt?: string) {
  const start = dateFormatter.format(new Date(startsAt));
  if (!endsAt) return start;
  return `${start}–${timeFormatter.format(new Date(endsAt))}`;
}

export function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(value));
}

export function formatRelativeDate(value: string) {
  const timestamp = new Date(value).getTime();
  const difference = timestamp - Date.now();
  const days = Math.round(difference / 86_400_000);
  if (Math.abs(days) <= 6) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      days,
      "day",
    );
  }
  return formatShortDate(value);
}

export function actionTypeLabel(type: ActionType) {
  return {
    draft_email: "Draft email",
    create_task: "Create task",
    schedule_follow_up: "Schedule follow-up",
  }[type];
}
