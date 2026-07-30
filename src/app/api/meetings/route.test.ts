import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/meetings/route";

describe("GET /api/meetings", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the three seeded upcoming meetings in a typed envelope", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(3);
    expect(payload.data[0]).toMatchObject({
      id: "product-weekly",
      title: "Product weekly: activation",
    });
    expect(payload.meta.demoMode).toBe(true);
  });
});
