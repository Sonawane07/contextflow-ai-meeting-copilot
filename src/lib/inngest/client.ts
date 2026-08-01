import { Inngest } from "inngest";

export const DAILY_BRIEF_REQUESTED = "contextflow/daily-brief.requested";

/**
 * Shared Inngest client.
 *
 * The event key is read from the environment rather than passed in, so it
 * stays server-side. Inngest's dev server does not require one.
 */
export const inngest = new Inngest({
  id: "contextflow",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
