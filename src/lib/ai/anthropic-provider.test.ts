import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { describeApiError } from "@/lib/ai/anthropic-provider";

// The SDK pins each error class to its own literal status, so these are
// constructed directly rather than through a shared helper.
const headers = () => new Headers();

describe("describeApiError", () => {
  it("names a billing failure rather than calling it an invalid request", () => {
    // A valid key on an account with no credit arrives as a 400, so without
    // this it reads as a malformed request. It is the most common first-run
    // failure, and the message has to point at billing.
    const error = new Anthropic.BadRequestError(
      400,
      undefined,
      "Your credit balance is too low to access the Anthropic API.",
      headers(),
    );
    expect(describeApiError(error)).toMatch(/no credit|Plans & Billing/i);
  });

  it("points at the key for an authentication failure", () => {
    const error = new Anthropic.AuthenticationError(
      401,
      undefined,
      "invalid x-api-key",
      headers(),
    );
    expect(describeApiError(error)).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("points at the model for a 404", () => {
    const error = new Anthropic.NotFoundError(
      404,
      undefined,
      "model not found",
      headers(),
    );
    expect(describeApiError(error)).toMatch(/ANTHROPIC_MODEL/);
  });

  it("marks rate limiting as retryable", () => {
    const error = new Anthropic.RateLimitError(
      429,
      undefined,
      "rate limit",
      headers(),
    );
    expect(describeApiError(error)).toMatch(/again/i);
  });

  it("still describes a bad request that is not about billing", () => {
    const error = new Anthropic.BadRequestError(
      400,
      undefined,
      "temperature: unexpected parameter",
      headers(),
    );
    expect(describeApiError(error)).toMatch(/invalid/i);
  });

  it("never leaks the provider's raw message", () => {
    // Provider errors can echo request content, which for this app means
    // meeting data.
    const error = new Anthropic.BadRequestError(
      400,
      undefined,
      "attendee jane@private.example discussed the acquisition",
      headers(),
    );
    const described = describeApiError(error);
    expect(described).not.toContain("jane@private.example");
    expect(described).not.toContain("acquisition");
  });
});
