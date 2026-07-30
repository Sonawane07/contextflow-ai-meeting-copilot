import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { DashboardClient } from "@/features/dashboard/dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardClient />
    </AppShell>
  );
}
