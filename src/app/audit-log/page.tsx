import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AuditLogClient } from "@/features/actions/audit-log-client";

export const metadata: Metadata = {
  title: "Audit log",
};

export default function AuditLogPage() {
  return (
    <AppShell>
      <AuditLogClient />
    </AppShell>
  );
}
