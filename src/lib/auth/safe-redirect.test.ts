import { describe, expect, it } from "vitest";
import { DEFAULT_REDIRECT, safeRedirect } from "@/lib/auth/safe-redirect";

describe("safeRedirect", () => {
  it("keeps a same-origin path", () => {
    expect(safeRedirect("/meetings/product-weekly")).toBe(
      "/meetings/product-weekly",
    );
  });

  it("falls back when no destination is supplied", () => {
    expect(safeRedirect(undefined)).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect("")).toBe(DEFAULT_REDIRECT);
  });

  it.each([
    ["//evil.example/phish", "protocol-relative URL"],
    ["/\\evil.example", "backslash protocol-relative URL"],
    ["https://evil.example", "absolute URL"],
    ["evil.example", "bare host"],
  ])("rejects %s (%s)", (candidate) => {
    expect(safeRedirect(candidate)).toBe(DEFAULT_REDIRECT);
  });
});
