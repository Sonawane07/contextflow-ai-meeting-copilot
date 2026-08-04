import { z } from "zod";

export const trackedEmailCategorySchema = z.enum([
  "interview_invite",
  "assessment",
  "offer",
  "rejection",
  "reply_needed",
  "acknowledgement",
  "other",
]);

export type TrackedEmailCategory = z.infer<typeof trackedEmailCategorySchema>;

/**
 * One classification, as returned by the model.
 *
 * `messageId` ties the result back to its input: the model is asked to echo
 * the id rather than rely on array position, so a dropped or reordered entry
 * cannot silently mislabel a different email.
 */
export const emailClassificationSchema = z.object({
  messageId: z.string().min(1),
  category: trackedEmailCategorySchema,
  needsReply: z.boolean(),
  reason: z.string().min(1).max(300),
  // The model returns a plain date when the message names one.
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export const emailClassificationListSchema = z.object({
  classifications: z.array(emailClassificationSchema),
});

export type EmailClassification = z.infer<typeof emailClassificationSchema>;
