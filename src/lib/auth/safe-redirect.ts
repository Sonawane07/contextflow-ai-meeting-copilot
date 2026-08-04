export const DEFAULT_REDIRECT = "/dashboard";

/**
 * Constrains a post-login destination to a same-origin path.
 *
 * A leading-slash check alone is insufficient: `//evil.example` and
 * `/\evil.example` are both treated as protocol-relative URLs by browsers, so
 * either would send the user off-site after a successful sign-in.
 */
export function safeRedirect(next: string | undefined | null): string {
  if (!next) return DEFAULT_REDIRECT;
  if (!next.startsWith("/")) return DEFAULT_REDIRECT;
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_REDIRECT;
  return next;
}
