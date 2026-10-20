import { createHash, randomBytes } from "node:crypto";

// Passwordless login: the owner gets a one-time link by email. Only hashes are stored,
// so a database leak does not hand out working links or sessions.

export const LOGIN_TOKEN_TTL_MINUTES = 15;
export const SESSION_TTL_DAYS = 30;
/** At most this many login links per email per window, so the form cannot be used to spam an inbox. */
export const LOGIN_LINKS_PER_WINDOW = 5;
export const LOGIN_WINDOW_MINUTES = 15;

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) && input.length <= 254;
}

export type TokenCheck = "ok" | "unknown" | "used" | "expired";

export function checkLoginToken(row: { usedAt: Date | null; expiresAt: Date } | null, now = new Date()): TokenCheck {
  if (!row) return "unknown";
  if (row.usedAt) return "used";
  if (row.expiresAt <= now) return "expired";
  return "ok";
}
