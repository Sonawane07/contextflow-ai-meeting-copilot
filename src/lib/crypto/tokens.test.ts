import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TokenCryptoError,
  decryptToken,
  encryptToken,
  isTokenEncryptionConfigured,
  safeEqual,
} from "@/lib/crypto/tokens";

// A fixed 32-byte key, base64. Test-only.
const KEY = Buffer.alloc(32, 7).toString("base64");
const OTHER_KEY = Buffer.alloc(32, 9).toString("base64");

function withKey(key: string) {
  vi.stubEnv("TOKEN_ENCRYPTION_KEY", key);
}

describe("token encryption", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a token", () => {
    withKey(KEY);
    const secret = "1//0abcdefg-google-refresh-token";
    expect(decryptToken(encryptToken(secret))).toBe(secret);
  });

  it("produces different ciphertext each time", () => {
    // A fresh IV per encryption: identical plaintext must not produce
    // identical ciphertext, or equal tokens would be identifiable in a dump.
    withKey(KEY);
    expect(encryptToken("same-token")).not.toBe(encryptToken("same-token"));
  });

  it("is versioned so the scheme can be rotated later", () => {
    withKey(KEY);
    expect(encryptToken("token").startsWith("v1.")).toBe(true);
  });

  it("fails to decrypt with the wrong key", () => {
    withKey(KEY);
    const payload = encryptToken("token");
    withKey(OTHER_KEY);
    expect(() => decryptToken(payload)).toThrow(TokenCryptoError);
  });

  it("rejects tampered ciphertext rather than returning garbage", () => {
    // The point of GCM over CBC: authentication, not just confidentiality.
    withKey(KEY);
    const payload = encryptToken("token");
    const parts = payload.split(".");
    const body = Buffer.from(parts[3]!, "base64url");
    body[0] = body[0]! ^ 0xff;
    parts[3] = body.toString("base64url");
    expect(() => decryptToken(parts.join("."))).toThrow(TokenCryptoError);
  });

  it.each([
    ["", "an empty payload"],
    ["not-encrypted", "an unstructured string"],
    ["v2.a.b.c", "an unknown version"],
  ])("rejects %j (%s)", (payload) => {
    withKey(KEY);
    expect(() => decryptToken(payload)).toThrow(TokenCryptoError);
  });

  it("refuses to encrypt an empty token", () => {
    withKey(KEY);
    expect(() => encryptToken("")).toThrow(TokenCryptoError);
  });

  it.each([
    ["", "an unset key"],
    [Buffer.alloc(16, 1).toString("base64"), "a 16-byte key"],
  ])("reports misconfiguration for %j (%s)", (key) => {
    withKey(key);
    expect(isTokenEncryptionConfigured()).toBe(false);
    expect(() => encryptToken("token")).toThrow(TokenCryptoError);
  });

  it("reports a valid key as configured", () => {
    withKey(KEY);
    expect(isTokenEncryptionConfigured()).toBe(true);
  });
});

describe("safeEqual", () => {
  it("matches identical values", () => {
    expect(safeEqual("abc123", "abc123")).toBe(true);
  });

  it.each([
    ["abc123", "abc124"],
    ["abc123", "abc1234"],
    ["", "a"],
  ])("rejects %j vs %j", (a, b) => {
    expect(safeEqual(a, b)).toBe(false);
  });
});
