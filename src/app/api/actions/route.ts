import { success } from "@/lib/api-response";
import { actionRepository } from "@/lib/demo/repositories";

export async function GET() {
  const actions = await actionRepository.list();
  return success(actions, {
    demoMode: process.env.DEMO_MODE !== "false",
  });
}
