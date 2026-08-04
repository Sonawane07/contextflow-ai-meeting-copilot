import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { DashboardClient } from "@/features/dashboard/dashboard-client";
import { requireSessionUser } from "@/lib/auth/session";

// Rendered per request: the shell shows the signed-in identity, so it must
// never be prerendered with the identity that happened to exist at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireSessionUser();
  return (
    <AppShell user={user}>
      <DashboardClient />
    </AppShell>
  );
}
