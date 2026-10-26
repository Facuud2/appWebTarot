import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const DEV_FALLBACK_SECRET =
  "grimorio-local-development-secret-key-do-not-use-in-prod-2026";

function getSigningSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  return DEV_FALLBACK_SECRET;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;
  const derivedBuffer = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(keyHex, "hex");
  if (derivedBuffer.length !== storedBuffer.length) return false;
  return timingSafeEqual(derivedBuffer, storedBuffer);
}

export function createRawSessionToken(): string {
  const raw = randomBytes(32).toString("base64url");
  const sig = createHmac("sha256", getSigningSecret())
    .update(raw)
    .digest("base64url");
  return `${raw}.${sig}`;
}

export function verifySignedSessionToken(signedToken: string): string | null {
  const parts = signedToken.split(".");
  if (parts.length !== 2) return null;
  const [raw, providedSig] = parts;
  if (!raw || !providedSig) return null;

  const expectedSig = createHmac("sha256", getSigningSecret())
    .update(raw)
    .digest("base64url");

  const bufA = Buffer.from(providedSig);
  const bufB = Buffer.from(expectedSig);
  if (bufA.length !== bufB.length) return null;
  if (!timingSafeEqual(bufA, bufB)) return null;

  return raw;
}

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
