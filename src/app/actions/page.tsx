import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { ActionCenterClient } from "@/features/actions/action-center-client";

export const metadata: Metadata = {
  title: "Action center",
};

export default function ActionsPage() {
  return (
    <AppShell>
      <ActionCenterClient />
    </AppShell>
  );
}
