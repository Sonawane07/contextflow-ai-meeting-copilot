import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isDemoMode } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types";

/**
 * The identity used by the credential-free demo path.
 *
 * The id is a fixed UUID so that demo behaviour matches the shape of a real
 * session, but no demo request ever reaches Supabase.
 */
export const DEMO_USER: SessionUser = {
  id: "00000000-0000-0000-0000-0000000000d0",
  email: "demo@contextflow.test",
  displayName: "Demo User",
  initials: "DU",
  isDemo: true,
};

export function deriveDisplayName(user: User): string {
  const metadataName = user.user_metadata?.full_name;
  if (typeof metadataName === "string" && metadataName.trim().length > 0) {
    return metadataName.trim();
  }
  const localPart = user.email?.split("@")[0] ?? "";
  return localPart.length > 0 ? localPart : "Signed-in user";
}

export function deriveInitials(displayName: string): string {
  const words = displayName
    .split(/[\s._-]+/)
    .filter((word) => word.length > 0)
    .slice(0, 2);
  if (words.length === 0) return "CF";
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

export function toSessionUser(user: User): SessionUser {
  const displayName = deriveDisplayName(user);
  return {
    id: user.id,
    email: user.email ?? "",
    displayName,
    initials: deriveInitials(displayName),
    isDemo: false,
  };
}

/**
 * Resolves the caller's identity, or null when the request is unauthenticated.
 *
 * `getUser()` is used rather than `getSession()` because it revalidates the
 * token against the auth server instead of trusting an unverified cookie.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (isDemoMode()) {
    return DEMO_USER;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return toSessionUser(data.user);
}

/** Server-component guard. Sends unauthenticated visitors to the login page. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
