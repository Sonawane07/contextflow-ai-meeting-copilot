import { z } from "zod";

/**
 * Event payloads are validated like any other external input.
 *
 * Inngest v4 does not carry compile-time event schemas, and a payload can be
 * replayed from the dashboard or sent by hand, so the handler must not trust
 * its shape.
 */
export const dailyBriefRequestedSchema = z.object({
  userId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date."),
});

export type DailyBriefRequested = z.infer<typeof dailyBriefRequestedSchema>;
