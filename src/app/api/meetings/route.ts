import { success } from "@/lib/api-response";
import { meetingRepository } from "@/lib/demo/repositories";

export async function GET() {
  const meetings = await meetingRepository.list();
  return success(meetings, {
    demoMode: process.env.DEMO_MODE !== "false",
  });
}
