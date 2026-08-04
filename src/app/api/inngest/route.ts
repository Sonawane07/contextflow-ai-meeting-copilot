import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { dailyBriefFunctions } from "@/lib/inngest/functions/generate-daily-brief";

/**
 * Inngest's serve endpoint.
 *
 * Request authenticity is established by Inngest's own request signing: the
 * handler verifies the signature against `INNGEST_SIGNING_KEY`, which it reads
 * from the environment. Without that key configured, this endpoint refuses
 * unsigned invocations rather than executing them, so it must not be treated as
 * a public trigger.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: dailyBriefFunctions,
});
