import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/meetings/route";

vi.mock("@/lib/request-context", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/request-context")>();
  return {
    ...actual,
    getRequestContext: vi.fn(actual.getRequestContext),
  };
});

const { getRequestContext } = await import("@/lib/request-context");

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

  it("returns 401 with a typed error when there is no session", async () => {
    vi.mocked(getRequestContext).mockResolvedValueOnce(null);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error.code).toBe("NOT_AUTHENTICATED");
    expect(payload.data).toBeUndefined();
  });
});
