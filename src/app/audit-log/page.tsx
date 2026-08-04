import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AuditLogClient } from "@/features/actions/audit-log-client";
import { requireSessionUser } from "@/lib/auth/session";

// Rendered per request: the shell shows the signed-in identity, so it must
// never be prerendered with the identity that happened to exist at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit log",
};

export default async function AuditLogPage() {
  const user = await requireSessionUser();
  return (
    <AppShell user={user}>
      <AuditLogClient />
    </AppShell>
  );
}
