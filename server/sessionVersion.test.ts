import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  decideSessionVersion,
  SESSION_ENDED_MESSAGE,
  INITIAL_SESSION_VERSION,
} from "../shared/sessionVersion";

/**
 * Per-user session invalidation.
 *
 * Tom's instruction of 9 September 2026: a general staff security control,
 * not something tied only to forgotten passwords. Every session carries the
 * account's version, every authenticated request fails if the version no
 * longer matches, and incrementing it ends that one account's sessions.
 *
 * These tests come in two halves. The pure half exercises the comparison
 * itself. The integrated half drives the real requireActiveStaffIdentity
 * against a mocked database, because the thing that actually has to be true
 * is that a token stops working after an increment, and that is a property
 * of the gate rather than of the comparison.
 */

describe("the version comparison", () => {
  it("accepts a token whose version matches the account", () => {
    expect(decideSessionVersion(3, 3).valid).toBe(true);
    expect(decideSessionVersion(INITIAL_SESSION_VERSION, INITIAL_SESSION_VERSION).valid).toBe(true);
  });

  it("REFUSES a token minted before the account was bumped", () => {
    const d = decideSessionVersion(3, 4);
    expect(d.valid).toBe(false);
    expect(d.code).toBe("version_superseded");
  });

  it("REFUSES a token from the future, not just a stale one", () => {
    // A version higher than the account's is not a newer session, it is a
    // token that did not come from this account's history.
    expect(decideSessionVersion(9, 4).code).toBe("version_superseded");
  });

  it("REFUSES a token carrying no version at all", () => {
    // Tokens minted before migration 0014 have no claim. Treating them as
    // exempt would leave exactly the sessions this control exists to cut
    // running unchallenged.
    expect(decideSessionVersion(undefined, 1).code).toBe("version_missing");
    expect(decideSessionVersion(null, 1).code).toBe("version_missing");
  });

  it("REFUSES a version of the wrong type even when it looks equal", () => {
    // "3" == 3 loosely. A claim of the wrong type was not minted by the
    // current code, and guessing its intent is how a check gets bypassed.
    expect(decideSessionVersion("3", 3).code).toBe("version_malformed");
    expect(decideSessionVersion(3.5, 3.5).code).toBe("version_malformed");
    expect(decideSessionVersion(NaN, NaN).code).toBe("version_malformed");
    expect(decideSessionVersion(true, 1).code).toBe("version_malformed");
  });

  it("REFUSES when the account side is malformed, rather than trusting the token", () => {
    expect(decideSessionVersion(1, undefined).code).toBe("version_malformed");
    expect(decideSessionVersion(1, null).code).toBe("version_malformed");
  });

  it("says the same thing for every refusal", () => {
    // A person holding a stolen token must not learn which control caught
    // them, and the person who owns the account only needs to sign in again.
    const reasons = [
      decideSessionVersion(undefined, 1),
      decideSessionVersion("1", 1),
      decideSessionVersion(1, 2),
    ].map(d => d.reason);
    expect(new Set(reasons).size).toBe(1);
    expect(reasons[0]).toBe(SESSION_ENDED_MESSAGE);
  });
});

// ── The integrated half ────────────────────────────────────────────────

const mockEnv = {
  cookieSecret: "test-jwt-secret",
  staffPortalPasswordHash: "",
  staffSsoTenantId: "",
  staffSsoClientId: "",
  staffSsoClientSecret: "",
  staffSsoRedirectUri: "",
};
vi.mock("./_core/env", () => ({ ENV: mockEnv }));

const mockDb = { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
const mockGetDb = vi.fn(async () => mockDb as any);
vi.mock("./db", () => ({ getDb: mockGetDb }));

const { mintStaffIdentityToken, requireActiveStaffIdentity } = await import("./staffIdentityAuth");

const ALICE = {
  id: 7,
  authProvider: "password",
  entraObjectId: null,
  googleSubjectId: null,
  email: "alice@worldstudentadvisors.com",
  displayName: "Alice",
  isActive: 1,
  sessionVersion: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
};

const BRIAN = { ...ALICE, id: 8, email: "brian@worldstudentadvisors.com", displayName: "Brian", sessionVersion: 2 };

/** The row requireActiveStaffIdentity will read back for whoever it looks up. */
function accountRowIs(row: unknown) {
  mockDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [row] }) }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDb.mockResolvedValue(mockDb as any);
});

describe("a session stops working the moment the account's version moves", () => {
  it("works while the versions agree", async () => {
    const token = await mintStaffIdentityToken(ALICE as never);
    accountRowIs(ALICE);
    const identity = await requireActiveStaffIdentity(token);
    expect(identity.staffUserId).toBe(7);
    expect(identity.email).toBe(ALICE.email);
  });

  it("STOPS WORKING IMMEDIATELY after an increment, on the very next request", async () => {
    // The whole point of the control. Same token, same account, one bump.
    const token = await mintStaffIdentityToken(ALICE as never);

    accountRowIs(ALICE);
    await expect(requireActiveStaffIdentity(token)).resolves.toMatchObject({ staffUserId: 7 });

    accountRowIs({ ...ALICE, sessionVersion: ALICE.sessionVersion + 1 });
    await expect(requireActiveStaffIdentity(token)).rejects.toThrow(SESSION_ENDED_MESSAGE);
  });

  it("leaves ANOTHER USER'S sessions working after the first user is revoked", async () => {
    // Revocation is per row. Brian must be untouched by Alice's bump.
    const aliceToken = await mintStaffIdentityToken(ALICE as never);
    const brianToken = await mintStaffIdentityToken(BRIAN as never);

    accountRowIs({ ...ALICE, sessionVersion: ALICE.sessionVersion + 1 });
    await expect(requireActiveStaffIdentity(aliceToken)).rejects.toThrow(SESSION_ENDED_MESSAGE);

    accountRowIs(BRIAN);
    const brian = await requireActiveStaffIdentity(brianToken);
    expect(brian.staffUserId).toBe(8);
    expect(brian.email).toBe(BRIAN.email);
  });

  it("a token minted after the bump works again, so revocation is not permanent lockout", async () => {
    const bumped = { ...ALICE, sessionVersion: ALICE.sessionVersion + 1 };
    const fresh = await mintStaffIdentityToken(bumped as never);
    accountRowIs(bumped);
    await expect(requireActiveStaffIdentity(fresh)).resolves.toMatchObject({ staffUserId: 7 });
  });

  it("REFUSES a pre-0014 token, which carries no version claim", async () => {
    // Minted the way the old code did, by leaving sessionVersion undefined.
    const legacy = await mintStaffIdentityToken({ ...ALICE, sessionVersion: undefined } as never);
    accountRowIs(ALICE);
    await expect(requireActiveStaffIdentity(legacy)).rejects.toThrow(SESSION_ENDED_MESSAGE);
  });

  it("still refuses a deactivated account before it ever looks at the version", async () => {
    // The pre-existing control must not be disturbed by the new one.
    const token = await mintStaffIdentityToken(ALICE as never);
    accountRowIs({ ...ALICE, isActive: 0 });
    await expect(requireActiveStaffIdentity(token)).rejects.toThrow(/not active/i);
  });

  it("carries the version in the token rather than inferring it at check time", async () => {
    // If the claim were absent, every check would fall back to the missing
    // branch and nobody could stay signed in at all.
    const token = await mintStaffIdentityToken(ALICE as never);
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    expect(claims.sessionVersion).toBe(ALICE.sessionVersion);
  });
});
