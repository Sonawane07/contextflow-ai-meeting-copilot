import { describe, expect, it } from "vitest";
import {
  REQUIRED_GOOGLE_SCOPE,
  hasCalendarScope,
} from "@/lib/integrations/google/config";

describe("hasCalendarScope", () => {
  it("accepts a grant that includes calendar.readonly", () => {
    expect(
      hasCalendarScope(
        `openid https://www.googleapis.com/auth/userinfo.email ${REQUIRED_GOOGLE_SCOPE}`,
      ),
    ).toBe(true);
  });

  it("rejects the grant Google returns when the calendar box is left unticked", () => {
    // The exact scope string from a real consent where only the identity
    // scopes were approved. The token is valid; every Calendar call 403s.
    expect(
      hasCalendarScope("https://www.googleapis.com/auth/userinfo.email openid"),
    ).toBe(false);
  });

  it("rejects an empty grant", () => {
    expect(hasCalendarScope("")).toBe(false);
  });

  it("does not match a different calendar scope by prefix", () => {
    // `calendar` (read/write) and `calendar.events` are neither what was
    // asked for nor substitutes; matching loosely would hide a wrong grant.
    expect(hasCalendarScope("https://www.googleapis.com/auth/calendar")).toBe(
      false,
    );
    expect(
      hasCalendarScope("https://www.googleapis.com/auth/calendar.events"),
    ).toBe(false);
  });

  it("tolerates irregular whitespace between scopes", () => {
    expect(hasCalendarScope(`  openid   ${REQUIRED_GOOGLE_SCOPE}  `)).toBe(true);
  });
});
