import { Inngest } from "inngest";

/**
 * Example production workflow only.
 *
 * Demo mode does not serve or invoke this function. A production deployment
 * would register it with an authenticated Inngest route, select meetings for
 * the signed-in user, and persist generated summaries through a database
 * repository.
 */
const inngest = new Inngest({ id: "contextflow" });

export const generateDailyBrief = inngest.createFunction(
  {
    id: "generate-daily-meeting-brief",
    name: "Generate daily meeting brief",
    triggers: [{ cron: "0 7 * * 1-5" }],
    retries: 3,
  },
  async ({ step }) => {
    const summary = await step.run("prepare-daily-brief-example", async () => ({
      workflow: "example-only",
      generatedAt: new Date().toISOString(),
      message:
        "A production adapter would retrieve today's meetings, generate briefs, and persist them here.",
    }));

    return summary;
  },
);
