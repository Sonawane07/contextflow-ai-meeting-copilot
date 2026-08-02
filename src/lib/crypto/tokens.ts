import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Authenticated encryption for OAuth tokens at rest.
 *
 * A stored refresh token is a long-lived credential to somebody's mailbox or
 * calendar, so row-level security alone is not enough: anyone with a database
 * dump would have the tokens. These are encrypted with AES-256-GCM before they
 * ever reach PostgreSQL, and the key lives only in the environment.
 *
 * GCM rather than CBC because it authenticates as well as encrypts — tampering
 * with the stored ciphertext fails decryption instead of silently yielding
 * different plaintext.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12; // 96-bit nonce, the size GCM is specified for.
const VERSION = "v1";

export class TokenCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenCryptoError";
  }
}

function loadKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new TokenCryptoError(
      "TOKEN_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32",
    );
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new TokenCryptoError("TOKEN_ENCRYPTION_KEY is not valid base64.");
  }

  if (key.length !== KEY_BYTES) {
    throw new TokenCryptoError(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}.`,
    );
  }
  return key;
}

export function isTokenEncryptionConfigured(): boolean {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns `v1.<iv>.<authTag>.<ciphertext>`, each part base64url.
 *
 * The version prefix exists so the key or algorithm can be rotated later
 * without having to guess how an existing row was encrypted.
 */
export function encryptToken(plaintext: string): string {
  if (plaintext.length === 0) {
    throw new TokenCryptoError("Refusing to encrypt an empty token.");
  }

  const key = loadKey();
  // A fresh IV per encryption. Reusing one under the same key breaks GCM badly.
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptToken(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4) {
    throw new TokenCryptoError("Encrypted token is malformed.");
  }

  const [version, ivPart, tagPart, ciphertextPart] = parts;
  if (version !== VERSION) {
    throw new TokenCryptoError(
      `Unsupported encrypted token version: ${version}.`,
    );
  }

  const key = loadKey();
  const iv = Buffer.from(ivPart!, "base64url");
  const authTag = Buffer.from(tagPart!, "base64url");
  const ciphertext = Buffer.from(ciphertextPart!, "base64url");

  if (iv.length !== IV_BYTES) {
    throw new TokenCryptoError("Encrypted token has an invalid nonce.");
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Wrong key, or the ciphertext was altered. Both are indistinguishable
    // here by design — GCM will not reveal which.
    throw new TokenCryptoError("Encrypted token could not be decrypted.");
  }
}

/** Constant-time compare, for OAuth `state` and similar short secrets. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
