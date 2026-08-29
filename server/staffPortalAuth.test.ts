import { describe, expect, it, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";

/**
 * Regression coverage for the Staff Portal auth layer, closing the gap
 * flagged after the Stage 1 manual verification: wrong/correct password,
 * JWT issuance, staffPortal.me's three token outcomes, an unset password
 * hash leaving the portal locked (never a default), the rate limiter's
 * threshold and rejection, and the requireStaffPortalAuth gate that every
 * future protected procedure must call. These exercise the real
 * bcrypt/jose logic — nothing here reimplements it to make assertions pass.
 */
const mockEnv: { cookieSecret: string; staffPortalPasswordHash: string } = {
  cookieSecret: "test-jwt-secret",
  staffPortalPasswordHash: "",
};

vi.mock("./_core/env", () => ({ ENV: mockEnv }));

const TEST_PASSWORD = "TestPass123!";
let testHash: string;

beforeEach(async () => {
  if (!testHash) testHash = await bcrypt.hash(TEST_PASSWORD, 12);
  mockEnv.cookieSecret = "test-jwt-secret";
  mockEnv.staffPortalPasswordHash = testHash;
});

describe("authenticateStaffPortal", () => {
  it("rejects the wrong password", async () => {
    const { authenticateStaffPortal } = await import("./staffPortalAuth");
    const token = await authenticateStaffPortal("wrong-password");
    expect(token).toBeNull();
  });

  it("accepts the correct password and issues a signed staff JWT", async () => {
    const { authenticateStaffPortal, verifyStaffPortalToken } = await import("./staffPortalAuth");
    const token = await authenticateStaffPortal(TEST_PASSWORD);
    expect(token).not.toBeNull();
    expect(typeof token).toBe("string");
    // A real, verifiable JWT — not just any truthy string.
    expect(await verifyStaffPortalToken(token as string)).toBe(true);
  });

  it("never falls back to a default: an unset password hash leaves the portal locked, whatever is typed", async () => {
    mockEnv.staffPortalPasswordHash = "";
    const { authenticateStaffPortal } = await import("./staffPortalAuth");
    expect(await authenticateStaffPortal(TEST_PASSWORD)).toBeNull();
    expect(await authenticateStaffPortal("")).toBeNull();
    expect(await authenticateStaffPortal("admin")).toBeNull();
  });
});

describe("verifyStaffPortalToken", () => {
  it("accepts a valid token from authenticateStaffPortal", async () => {
    const { authenticateStaffPortal, verifyStaffPortalToken } = await import("./staffPortalAuth");
    const token = (await authenticateStaffPortal(TEST_PASSWORD)) as string;
    expect(await verifyStaffPortalToken(token)).toBe(true);
  });

  it("returns false for an invalid/garbage token, never throws", async () => {
    const { verifyStaffPortalToken } = await import("./staffPortalAuth");
    await expect(verifyStaffPortalToken("not-a-jwt")).resolves.toBe(false);
  });

  it("returns false for an empty token, never throws", async () => {
    const { verifyStaffPortalToken } = await import("./staffPortalAuth");
    await expect(verifyStaffPortalToken("")).resolves.toBe(false);
  });

  it("rejects a token signed for a different purpose (e.g. Student Portal), even with the same secret material shape", async () => {
    const jose = await import("jose");
    const { verifyStaffPortalToken } = await import("./staffPortalAuth");
    const secret = new TextEncoder().encode(mockEnv.cookieSecret + "-staff-portal");
    const wrongPurposeToken = await new jose.SignJWT({ purpose: "student_portal" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("12h")
      .sign(secret);
    expect(await verifyStaffPortalToken(wrongPurposeToken)).toBe(false);
  });

  it("rejects an expired token", async () => {
    const jose = await import("jose");
    const { verifyStaffPortalToken } = await import("./staffPortalAuth");
    const secret = new TextEncoder().encode(mockEnv.cookieSecret + "-staff-portal");
    const expiredToken = await new jose.SignJWT({ purpose: "staff_portal" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);
    expect(await verifyStaffPortalToken(expiredToken)).toBe(false);
  });
});

describe("requireStaffPortalAuth — the gate protected procedures must call", () => {
  it("resolves silently for a valid token", async () => {
    const { authenticateStaffPortal, requireStaffPortalAuth } = await import("./staffPortalAuth");
    const token = (await authenticateStaffPortal(TEST_PASSWORD)) as string;
    await expect(requireStaffPortalAuth(token)).resolves.toBeUndefined();
  });

  it("throws UNAUTHORIZED for an invalid token — no protected procedure can be reached without a valid session", async () => {
    const { requireStaffPortalAuth } = await import("./staffPortalAuth");
    await expect(requireStaffPortalAuth("garbage")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws UNAUTHORIZED for an empty token", async () => {
    const { requireStaffPortalAuth } = await import("./staffPortalAuth");
    await expect(requireStaffPortalAuth("")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("isStaffPortalLoginRateLimited", () => {
  it("permits the intended threshold — every attempt up to max in the window", async () => {
    const { isStaffPortalLoginRateLimited } = await import("./staffPortalAuth");
    const ip = "198.51.100.1";
    for (let i = 0; i < 10; i++) {
      expect(isStaffPortalLoginRateLimited(ip, 60_000, 10)).toBe(false);
    }
  });

  it("rejects the next attempt once the threshold is exceeded", async () => {
    const { isStaffPortalLoginRateLimited } = await import("./staffPortalAuth");
    const ip = "198.51.100.2";
    for (let i = 0; i < 10; i++) {
      isStaffPortalLoginRateLimited(ip, 60_000, 10);
    }
    expect(isStaffPortalLoginRateLimited(ip, 60_000, 10)).toBe(true);
  });

  it("tracks each IP independently", async () => {
    const { isStaffPortalLoginRateLimited } = await import("./staffPortalAuth");
    const ipA = "198.51.100.3";
    const ipB = "198.51.100.4";
    for (let i = 0; i < 10; i++) isStaffPortalLoginRateLimited(ipA, 60_000, 10);
    expect(isStaffPortalLoginRateLimited(ipA, 60_000, 10)).toBe(true);
    expect(isStaffPortalLoginRateLimited(ipB, 60_000, 10)).toBe(false);
  });

  it("resets after the window elapses", async () => {
    const { isStaffPortalLoginRateLimited } = await import("./staffPortalAuth");
    const ip = "198.51.100.5";
    expect(isStaffPortalLoginRateLimited(ip, 10, 1)).toBe(false);
    expect(isStaffPortalLoginRateLimited(ip, 10, 1)).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(isStaffPortalLoginRateLimited(ip, 10, 1)).toBe(false);
  });
});
