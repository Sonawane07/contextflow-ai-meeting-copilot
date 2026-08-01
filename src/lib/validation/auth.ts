import { z } from "zod";

/**
 * Password length is bounded at 72 bytes because bcrypt silently truncates
 * beyond that; rejecting is clearer than accepting a password whose tail is
 * ignored at verification time.
 */
export const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(72),
});

export const signUpSchema = credentialsSchema.extend({
  displayName: z.string().min(1).max(80).optional(),
});

export type Credentials = z.infer<typeof credentialsSchema>;
