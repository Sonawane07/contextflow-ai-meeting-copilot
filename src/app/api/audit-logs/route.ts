import { success } from "@/lib/api-response";
import { auditRepository } from "@/lib/demo/repositories";

export async function GET() {
  const logs = await auditRepository.list();
  return success(logs, {
    demoMode: process.env.DEMO_MODE !== "false",
  });
}
