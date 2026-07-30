import { z } from "zod";

export const actionDecisionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});
