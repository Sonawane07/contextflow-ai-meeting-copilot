import "server-only";

import type { AIProvider } from "@/lib/ai/provider";
import { AnthropicAIProvider } from "@/lib/ai/anthropic-provider";
import { MockAIProvider } from "@/lib/ai/mock-provider";

export function getAIProvider(): AIProvider {
  const demoMode = process.env.DEMO_MODE !== "false";
  if (demoMode || !process.env.ANTHROPIC_API_KEY) {
    return new MockAIProvider();
  }
  return new AnthropicAIProvider();
}
