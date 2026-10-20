import { describe, expect, it } from "vitest";
import { checkLoginToken, hashToken, isEmail, newToken, normalizeEmail } from "@/lib/domain/auth";

describe("login tokens", () => {
  it("are random and stored only as a hash", () => {
    const a = newToken();
    expect(a).not.toBe(newToken());
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).toBe(hashToken(a));
  });

  it("are single use and expire", () => {
    const now = new Date("2026-10-20T10:00:00Z");
    expect(checkLoginToken(null, now)).toBe("unknown");
    expect(checkLoginToken({ usedAt: null, expiresAt: new Date("2026-10-20T10:10:00Z") }, now)).toBe("ok");
    expect(checkLoginToken({ usedAt: now, expiresAt: new Date("2026-10-20T10:10:00Z") }, now)).toBe("used");
    expect(checkLoginToken({ usedAt: null, expiresAt: now }, now)).toBe("expired");
  });

  it("normalises and validates emails", () => {
    expect(normalizeEmail("  Owner@Example.AZ ")).toBe("owner@example.az");
    expect(isEmail("owner@example.az")).toBe(true);
    expect(isEmail("owner@example")).toBe(false);
    expect(isEmail("not an email")).toBe(false);
  });
});
