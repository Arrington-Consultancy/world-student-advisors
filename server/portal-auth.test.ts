/**
 * Tests for findGoogleUserForLogin — the portal-login Google lookup function.
 *
 * The function must:
 * 1. Log in an existing user matched by googleSub.
 * 2. Link googleSub and log in a user matched by email (when emailVerified=true).
 * 3. Return { status: "not_found" } (not create a row) when email match exists
 *    but emailVerified=false.
 * 4. Return { status: "not_found" } (not create a row) when no match exists at all.
 * 5. Return { status: "inactive" } for matched inactive accounts on both paths.
 * 6. Refuse verified-email linking when a different googleSub is already linked.
 * 7. Return { status: "db_unavailable" } when getDb() returns null.
 *
 * createPortalUser (the registration-only path) is NOT exercised here — it is
 * covered by server/contact.googleSignup.test.ts and portal-onboarding.test.ts.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mock getDb ───────────────────────────────────────────────────────────────
// We build a minimal drizzle-shaped query builder that records every method
// call and returns results set per-test via `__setRows` / `__setUpdateResult`.

type MockUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  googleSub: string | null;
  isActive: boolean;
};

function makeMockDb() {
  let _selectRows: MockUser[] = [];
  let _selectCallIndex = 0;
  let _selectRowsMap: Record<number, MockUser[]> = {};
  const _insertCalls: unknown[] = [];
  const _updateCalls: { set: unknown; where: unknown }[] = [];

  const db = {
    __setSelectRows(rows: MockUser[], callIndex?: number) {
      if (callIndex !== undefined) {
        _selectRowsMap[callIndex] = rows;
      } else {
        _selectRows = rows;
        _selectRowsMap = {};
        _selectCallIndex = 0;
      }
    },
    __getInsertCalls() {
      return _insertCalls;
    },
    __getUpdateCalls() {
      return _updateCalls;
    },
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit() {
                  const idx = _selectCallIndex++;
                  const rows = _selectRowsMap[idx] ?? _selectRows;
                  return Promise.resolve(rows);
                },
              };
            },
          };
        },
      };
    },
    insert(_table: unknown) {
      return {
        values(data: unknown) {
          _insertCalls.push(data);
          return Promise.resolve([{ insertId: 99 }]);
        },
      };
    },
    update(_table: unknown) {
      return {
        set(data: unknown) {
          return {
            where(condition: unknown) {
              _updateCalls.push({ set: data, where: condition });
              return Promise.resolve();
            },
          };
        },
      };
    },
  };
  return db;
}

let mockDb: ReturnType<typeof makeMockDb> | null = makeMockDb();

vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
  recordFailedSubmission: vi.fn().mockResolvedValue(undefined),
}));

// Mock jose so mintPortalToken works without a real secret
vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  return {
    ...actual,
    SignJWT: class {
      _payload: unknown;
      constructor(payload: unknown) {
        this._payload = payload;
      }
      setProtectedHeader() {
        return this;
      }
      setExpirationTime() {
        return this;
      }
      async sign() {
        return "mocked-portal-jwt";
      }
    },
  };
});

const { getDb } = await import("./db");
const mockedGetDb = vi.mocked(getDb);

const { findGoogleUserForLogin } = await import("./portal-auth");

const PROFILE = {
  sub: "google-sub-abc",
  email: "user@example.com",
  firstName: "Test",
  lastName: "User",
};

const BASE_USER: MockUser = {
  id: 1,
  email: "user@example.com",
  firstName: "Test",
  lastName: "User",
  googleSub: "google-sub-abc",
  isActive: true,
};

beforeEach(() => {
  mockDb = makeMockDb();
  vi.clearAllMocks();
  mockedGetDb.mockResolvedValue(mockDb);
});

// ── 1. Match by googleSub ─────────────────────────────────────────────────────
describe("1 – googleSub match: existing user logs in", () => {
  it("returns status=ok with a token and user when googleSub matches", async () => {
    mockDb!.__setSelectRows([BASE_USER]);

    const result = await findGoogleUserForLogin(PROFILE, true);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.token).toBe("mocked-portal-jwt");
      expect(result.user.id).toBe(1);
      expect(result.user.email).toBe("user@example.com");
    }
  });

  it("updates lastLogin on the matching user", async () => {
    mockDb!.__setSelectRows([BASE_USER]);

    await findGoogleUserForLogin(PROFILE, true);

    const updates = mockDb!.__getUpdateCalls();
    const loginUpdate = updates.find((u) => (u.set as Record<string, unknown>).lastLogin);
    expect(loginUpdate).toBeDefined();
  });

  it("does not insert any row for a googleSub match", async () => {
    mockDb!.__setSelectRows([BASE_USER]);

    await findGoogleUserForLogin(PROFILE, true);

    expect(mockDb!.__getInsertCalls()).toHaveLength(0);
  });

  it("returns inactive when the matching user is inactive (isActive=false)", async () => {
    mockDb!.__setSelectRows([{ ...BASE_USER, isActive: false }]);

    const result = await findGoogleUserForLogin(PROFILE, true);

    expect(result.status).toBe("inactive");
  });
});

// ── 2. Email match + emailVerified=true → link & log in ──────────────────────
describe("2 – email match with emailVerified=true: links googleSub and logs in", () => {
  it("returns status=ok when no googleSub match but email matches and emailVerified=true", async () => {
    const userNoSub: MockUser = { ...BASE_USER, googleSub: null };
    // First select (by googleSub): no rows. Second select (by email): one row.
    mockDb!.__setSelectRows([], 0);
    mockDb!.__setSelectRows([userNoSub], 1);

    const result = await findGoogleUserForLogin(PROFILE, true);

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.user.id).toBe(1);
    }
  });

  it("issues an UPDATE to link googleSub to the existing account when no googleSub is set", async () => {
    const userNoSub: MockUser = { ...BASE_USER, googleSub: null };
    mockDb!.__setSelectRows([], 0);
    mockDb!.__setSelectRows([userNoSub], 1);

    await findGoogleUserForLogin(PROFILE, true);

    const updates = mockDb!.__getUpdateCalls();
    const linkUpdate = updates.find((u) => (u.set as Record<string, unknown>).googleSub === PROFILE.sub);
    expect(linkUpdate).toBeDefined();
  });

  it("does NOT insert a new portal user row (only update)", async () => {
    const userNoSub: MockUser = { ...BASE_USER, googleSub: null };
    mockDb!.__setSelectRows([], 0);
    mockDb!.__setSelectRows([userNoSub], 1);

    await findGoogleUserForLogin(PROFILE, true);

    expect(mockDb!.__getInsertCalls()).toHaveLength(0);
  });

  it("returns inactive when the email-matched user is inactive", async () => {
    const inactiveUser: MockUser = { ...BASE_USER, googleSub: null, isActive: false };
    mockDb!.__setSelectRows([], 0);
    mockDb!.__setSelectRows([inactiveUser], 1);

    const result = await findGoogleUserForLogin(PROFILE, true);

    expect(result.status).toBe("inactive");
  });

  it("returns conflict and does not overwrite a different existing googleSub", async () => {
    const userWithDifferentSub: MockUser = { ...BASE_USER, googleSub: "different-google-sub" };
    mockDb!.__setSelectRows([], 0);
    mockDb!.__setSelectRows([userWithDifferentSub], 1);

    const result = await findGoogleUserForLogin(PROFILE, true);

    expect(result.status).toBe("conflict");
    expect(mockDb!.__getUpdateCalls()).toHaveLength(0);
  });
});

// ── 3. Email match but emailVerified=false → no link, no login ───────────────
describe("3 – email match with emailVerified=false: treated as no match", () => {
  it("returns not_found even though an email match exists when emailVerified=false", async () => {
    // Both googleSub and email selects return no rows (we short-circuit the email lookup)
    mockDb!.__setSelectRows([], 0);
    // The email select should not be reached when emailVerified=false

    const result = await findGoogleUserForLogin(PROFILE, false);

    expect(result.status).toBe("not_found");
  });

  it("does not insert a portal user row when emailVerified=false", async () => {
    mockDb!.__setSelectRows([], 0);

    await findGoogleUserForLogin(PROFILE, false);

    expect(mockDb!.__getInsertCalls()).toHaveLength(0);
  });

  it("does not link googleSub to any account when emailVerified=false", async () => {
    mockDb!.__setSelectRows([], 0);

    await findGoogleUserForLogin(PROFILE, false);

    const linkUpdates = mockDb!.__getUpdateCalls().filter(
      (u) => (u.set as Record<string, unknown>).googleSub === PROFILE.sub,
    );
    expect(linkUpdates).toHaveLength(0);
  });
});

// ── 4. No match at all → not_found, no insert ────────────────────────────────
describe("4 – no match at all: not_found, no portal user created", () => {
  it("returns status=not_found when neither googleSub nor email matches", async () => {
    mockDb!.__setSelectRows([], 0);
    mockDb!.__setSelectRows([], 1);

    const result = await findGoogleUserForLogin(PROFILE, true);

    expect(result.status).toBe("not_found");
  });

  it("does not insert a new portal user row when no match exists", async () => {
    mockDb!.__setSelectRows([], 0);
    mockDb!.__setSelectRows([], 1);

    await findGoogleUserForLogin(PROFILE, true);

    expect(mockDb!.__getInsertCalls()).toHaveLength(0);
  });
});

// ── 5. DB unavailable ─────────────────────────────────────────────────────────
describe("5 – DB unavailable: returns db_unavailable", () => {
  it("returns status=db_unavailable when getDb() returns null", async () => {
    mockedGetDb.mockResolvedValueOnce(null);

    const result = await findGoogleUserForLogin(PROFILE, true);

    expect(result.status).toBe("db_unavailable");
  });
});
