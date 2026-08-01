import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { MeetingDetailClient } from "@/features/meetings/meeting-detail-client";
import { requireSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Meeting",
};

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSessionUser();
  const { id } = await params;
  return (
    <AppShell user={user}>
      <MeetingDetailClient meetingId={id} />
    </AppShell>
  );
}
