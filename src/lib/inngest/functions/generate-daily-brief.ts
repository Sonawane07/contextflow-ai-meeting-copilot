import "server-only";

import { NonRetriableError } from "inngest";
import { getAIProvider } from "@/lib/ai/get-provider";
import { AIProviderError } from "@/lib/ai/anthropic-provider";
import { DAILY_BRIEF_REQUESTED, inngest } from "@/lib/inngest/client";
import { isWithinRange, utcDayRange } from "@/lib/inngest/day-range";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/supabase/config";
import {
  SupabaseActionRepository,
  SupabaseMeetingRepository,
} from "@/lib/supabase/repositories";
import { dailyBriefRequestedSchema } from "@/lib/validation/events";
import { meetingBriefSchema } from "@/lib/validation/brief";

/**
 * Weekday fan-out: finds who has meetings today and emits one event per user.
 *
 * Fanning out rather than looping keeps each unit of work independently
 * retryable and observable. One user's provider failure cannot stall or fail
 * everybody else's brief.
 */
export const scheduleDailyBriefs = inngest.createFunction(
  {
    id: "schedule-daily-briefs",
    name: "Schedule daily meeting briefs",
    triggers: [{ cron: "0 7 * * 1-5" }],
    retries: 3,
  },
  async ({ step }) => {
    if (isDemoMode()) {
      // Demo deployments have no database to read and no user to notify.
      return { skipped: "demo-mode" as const, dispatched: 0 };
    }

    const range = await step.run("resolve-day-range", async () =>
      utcDayRange(new Date()),
    );

    const userIds = await step.run("find-users-with-meetings", async () => {
      const admin = createSupabaseAdminClient();
      const { data, error } = await admin
        .from("meetings")
        .select("user_id")
        .gte("starts_at", range.start)
        .lt("starts_at", range.end);

      if (error) {
        throw new Error(`Could not list today's meetings: ${error.message}`);
      }
      return [...new Set((data ?? []).map((row) => row.user_id))];
    });

    if (userIds.length === 0) {
      return { skipped: "no-meetings" as const, dispatched: 0 };
    }

    await step.sendEvent(
      "fan-out-daily-briefs",
      userIds.map((userId) => ({
        name: DAILY_BRIEF_REQUESTED,
        data: { userId, date: range.date },
      })),
    );

    return { dispatched: userIds.length, date: range.date };
  },
);

/**
 * Generates and persists today's briefs for one user.
 *
 * `idempotency` keys the run on user and date, so a replayed or duplicated
 * event does not produce a second round of provider calls. The brief upsert is
 * itself idempotent per meeting, which makes a partial retry safe: meetings
 * already handled are simply rewritten with the same content.
 *
 * `concurrency` bounds simultaneous provider calls across all users, because
 * the model API is the scarce resource here, not the database.
 */
export const generateDailyBriefForUser = inngest.createFunction(
  {
    id: "generate-daily-brief-for-user",
    name: "Generate daily meeting briefs for one user",
    triggers: [{ event: DAILY_BRIEF_REQUESTED }],
    retries: 2,
    idempotency: "event.data.userId + '-' + event.data.date",
    concurrency: { limit: 5 },
  },
  async ({ event, step }) => {
    if (isDemoMode()) {
      return { skipped: "demo-mode" as const, generated: 0 };
    }

    const parsed = dailyBriefRequestedSchema.safeParse(event.data);
    if (!parsed.success) {
      // A malformed payload will never become valid on retry.
      throw new NonRetriableError(
        `Invalid ${DAILY_BRIEF_REQUESTED} payload: ${parsed.error.message}`,
      );
    }
    const { userId, date } = parsed.data;

    const meetings = await step.run("load-todays-meetings", async () => {
      const admin = createSupabaseAdminClient();
      const repository = new SupabaseMeetingRepository(admin, userId);
      const range = utcDayRange(new Date(`${date}T00:00:00.000Z`));
      // Filtered in memory: a user's meeting list is small, and reusing the
      // repository keeps one mapping of rows to the domain model. A date-ranged
      // repository method is the right change if that stops being true.
      const all = await repository.list();
      return all.filter((meeting) => isWithinRange(meeting.startsAt, range));
    });

    if (meetings.length === 0) {
      return { skipped: "no-meetings" as const, generated: 0 };
    }

    let generated = 0;

    for (const meeting of meetings) {
      // One step per meeting: a provider failure retries just that meeting,
      // and completed meetings are not regenerated on replay.
      const result = await step.run(`brief-${meeting.id}`, async () => {
        const admin = createSupabaseAdminClient();
        const meetingRepository = new SupabaseMeetingRepository(admin, userId);
        const actionRepository = new SupabaseActionRepository(admin, userId);
        const provider = getAIProvider();

        try {
          const output = await provider.generateMeetingBrief(meeting);
          const brief = meetingBriefSchema.parse({
            ...output,
            generatedAt: new Date().toISOString(),
            provider: provider.name,
          });

          await meetingRepository.saveBrief(meeting.id, brief);
          // Existing decisions are preserved by the upsert, so a scheduled
          // regeneration never resets an approval the user already made.
          await actionRepository.upsertForMeeting(
            meeting.id,
            meeting.title,
            brief.proposedActions,
          );
          return { meetingId: meeting.id, status: "generated" as const };
        } catch (error) {
          if (error instanceof AIProviderError) {
            // Invalid model output will not improve by retrying the same input.
            throw new NonRetriableError(
              `Brief generation rejected for ${meeting.id}: ${error.message}`,
            );
          }
          throw error;
        }
      });

      if (result.status === "generated") generated += 1;
    }

    return { userId, date, generated };
  },
);

export const dailyBriefFunctions = [
  scheduleDailyBriefs,
  generateDailyBriefForUser,
];
