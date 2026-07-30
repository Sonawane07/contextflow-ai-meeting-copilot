import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { MeetingDetailClient } from "@/features/meetings/meeting-detail-client";

export const metadata: Metadata = {
  title: "Meeting",
};

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <MeetingDetailClient meetingId={id} />
    </AppShell>
  );
}
