import "server-only";

import type { ActionRepository } from "@/features/actions/repository";
import type { AuditRepository } from "@/features/actions/audit-repository";
import type { MeetingRepository } from "@/features/meetings/repository";
import { getSessionUser } from "@/lib/auth/session";
import {
  actionRepository as demoActions,
  auditRepository as demoAudit,
  meetingRepository as demoMeetings,
} from "@/lib/demo/repositories";
import { isDemoMode } from "@/lib/supabase/config";
import {
  SupabaseActionRepository,
  SupabaseAuditRepository,
  SupabaseMeetingRepository,
} from "@/lib/supabase/repositories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types";

export interface RequestContext {
  user: SessionUser;
  demoMode: boolean;
  meetings: MeetingRepository;
  actions: ActionRepository;
  audit: AuditRepository;
}

/**
 * Resolves the identity and repository set for one request.
 *
 * This is the single place that decides between the in-memory demo path and
 * persistent Supabase repositories. Route handlers depend on the repository
 * interfaces only, so neither path leaks into the handler bodies.
 *
 * Returns null when the request is unauthenticated; callers turn that into a
 * 401 rather than falling back to demo data, so a misconfigured production
 * deployment cannot silently serve someone else's seeded workspace.
 */
export async function getRequestContext(): Promise<RequestContext | null> {
  if (isDemoMode()) {
    const user = await getSessionUser();
    if (!user) return null;
    return {
      user,
      demoMode: true,
      meetings: demoMeetings,
      actions: demoActions,
      audit: demoAudit,
    };
  }

  const user = await getSessionUser();
  if (!user) return null;

  const client = await createSupabaseServerClient();
  return {
    user,
    demoMode: false,
    meetings: new SupabaseMeetingRepository(client, user.id),
    actions: new SupabaseActionRepository(client, user.id),
    audit: new SupabaseAuditRepository(client, user.id),
  };
}
