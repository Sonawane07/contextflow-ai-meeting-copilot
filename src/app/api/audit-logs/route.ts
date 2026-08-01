import { failure, success, unauthorized } from "@/lib/api-response";
import { getRequestContext } from "@/lib/request-context";

export async function GET() {
  const context = await getRequestContext();
  if (!context) return unauthorized();

  try {
    const logs = await context.audit.list();
    return success(logs, { demoMode: context.demoMode });
  } catch {
    return failure(500, "AUDIT_READ_FAILED", "Audit logs could not be loaded.");
  }
}
