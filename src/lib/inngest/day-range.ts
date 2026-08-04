export interface DayRange {
  /** Inclusive lower bound, ISO 8601. */
  start: string;
  /** Exclusive upper bound, ISO 8601. */
  end: string;
  /** `YYYY-MM-DD`, used as the idempotency key for a day's run. */
  date: string;
}

/**
 * The UTC day containing `now`, as a half-open interval.
 *
 * Half-open avoids the double-count a `<=` upper bound would cause for a
 * meeting starting exactly at midnight.
 *
 * This is UTC rather than per-user local time. Scheduling a brief in each
 * recipient's own morning requires storing a time zone per user, which the
 * schema does not yet carry; until it does, a single UTC window is the honest
 * behaviour rather than one that silently assumes the server's locale.
 */
export function utcDayRange(now: Date): DayRange {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    date: start.toISOString().slice(0, 10),
  };
}

/** True when `startsAt` falls inside the half-open range. */
export function isWithinRange(startsAt: string, range: DayRange): boolean {
  return startsAt >= range.start && startsAt < range.end;
}
