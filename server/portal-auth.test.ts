import { describe, expect, it, vi, beforeEach } from "vitest";

// createPortalUser and generateResetToken talk to the DB via getDb(), so
// this fakes the drizzle chain rather than mocking createPortalUser itself
// (unlike server/portal-onboarding.test.ts, which tests the router around a
// mocked createPortalUser) — the whole point here is to exercise the real
// existing-row branch that the pipedrivePersonId-repair bug lives in.
vi.mock("./db", () => ({ getDb: vi.fn() }));

const { getDb } = await import("./db");
const { createPortalUser, findGoogleUser } = await import("./portal-auth");

const mockedGetDb = vi.mocked(getDb);

/**
 * A minimal fake of the one drizzle chain createPortalUser/generateResetToken
 * use: select().from().where().limit() for the existing-row lookup, plus
 * update().set().where() (called once for a Google-sub link, once for a
 * pipedrivePersonId repair, once for the reset-token write inside
 * generateResetToken) and insert().values() for a brand-new row. Every
 * update's set() payload is captured, in call order, so tests can assert
 * exactly what was and wasn't written.
 */
function makeFakeDb(existingRows: Record<string, unknown>[]) {
  const updateSets: Record<string, unknown>[] = [];
  const insertValues: Record<string, unknown>[] = [];

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(existingRows)),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        updateSets.push(payload);
        return { where: vi.fn(() => Promise.resolve()) };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((payload: Record<string, unknown>) => {
        insertValues.push(payload);
        return Promise.resolve([{ insertId: 42 }]);
      }),
    })),
  };

  return { db, updateSets, insertValues };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPortalUser — pipedrivePersonId repair on an existing account", () => {
  it("repairs a Google-created account (null pipedrivePersonId) once a genuine application succeeds", async () => {
    const { db, updateSets } = makeFakeDb([
      { id: 7, email: "tom@arringtonconsultancy.com", googleSub: "google-sub-123", pipedrivePersonId: null },
    ]);
    mockedGetDb.mockResolvedValue(db as any);

    const result = await createPortalUser({
      email: "tom@arringtonconsultancy.com",
      firstName: "Tom",
      lastName: "Arrington",
      pipedrivePersonId: 8371,
      pipedriveObjectType: "lead",
      pipedriveObjectId: "58877ff0-a229-11f1-a4a0-1756967adcc3",
    });

    expect(result.isExisting).toBe(true);
    expect(result.userId).toBe(7);

    const repairSet = updateSets.find(s => "pipedrivePersonId" in s);
    expect(repairSet).toEqual({
      pipedrivePersonId: 8371,
      pipedriveObjectType: "lead",
      pipedriveObjectId: "58877ff0-a229-11f1-a4a0-1756967adcc3",
    });
  });

  it("never overwrites an already-linked account, even with a different personId on this submission", async () => {
    const { db, updateSets } = makeFakeDb([
      { id: 9, email: "already-linked@example.com", googleSub: null, pipedrivePersonId: 1111 },
    ]);
    mockedGetDb.mockResolvedValue(db as any);

    await createPortalUser({
      email: "already-linked@example.com",
      firstName: "Amara",
      lastName: "Okafor",
      pipedrivePersonId: 2222,
      pipedriveObjectType: "lead",
      pipedriveObjectId: "some-other-lead-id",
    });

    const repairSet = updateSets.find(s => "pipedrivePersonId" in s);
    expect(repairSet).toBeUndefined();
  });

  it("still links a fresh Google sub for an already-linked account without touching pipedrivePersonId", async () => {
    const { db, updateSets } = makeFakeDb([
      { id: 11, email: "linked-no-google@example.com", googleSub: null, pipedrivePersonId: 5555 },
    ]);
    mockedGetDb.mockResolvedValue(db as any);

    await createPortalUser({
      email: "linked-no-google@example.com",
      firstName: "Priya",
      lastName: "Nair",
      pipedrivePersonId: 5555,
      pipedriveObjectType: "lead",
      pipedriveObjectId: "same-lead-id",
      googleSub: "new-google-sub",
    });

    expect(updateSets).toContainEqual({ googleSub: "new-google-sub" });
    expect(updateSets.find(s => "pipedrivePersonId" in s)).toBeUndefined();
  });

  it("a brand-new applicant (no existing row) still gets pipedrivePersonId set on insert, as before", async () => {
    const { db, insertValues, updateSets } = makeFakeDb([]);
    mockedGetDb.mockResolvedValue(db as any);

    const result = await createPortalUser({
      email: "new.student@example.com",
      firstName: "New",
      lastName: "Student",
      pipedrivePersonId: 9999,
      pipedriveObjectType: "lead",
      pipedriveObjectId: "brand-new-lead-id",
    });

    expect(result.isExisting).toBe(false);
    expect(insertValues[0]).toMatchObject({
      email: "new.student@example.com",
      pipedrivePersonId: 9999,
      pipedriveObjectType: "lead",
      pipedriveObjectId: "brand-new-lead-id",
    });
    // The repair path is for existing rows only — nothing to repair here.
    expect(updateSets.find(s => "pipedrivePersonId" in s)).toBeUndefined();
  });
});

/**
 * findGoogleUser is find-only: the application is the registration, so
 * Google sign-in on /portal/login must never create a portal account. This
 * fakes the same select().from().where().limit() chain as makeFakeDb above,
 * but per-call rather than a single fixed result, since the function makes
 * up to two sequential lookups (by googleSub, then by email) and the two
 * calls need to return different rows to exercise the fallback path.
 */
function makeSequencedFakeDb(selectResults: Record<string, unknown>[][]) {
  const updateSets: Record<string, unknown>[] = [];
  let selectCall = 0;

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectResults[selectCall++] ?? [])),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((payload: Record<string, unknown>) => {
        updateSets.push(payload);
        return { where: vi.fn(() => Promise.resolve()) };
      }),
    })),
  };

  return { db, updateSets };
}

const GOOGLE_PROFILE = {
  sub: "google-sub-1",
  email: "student@example.com",
  firstName: "Amara",
  lastName: "Osei",
};

describe("findGoogleUser — find-only Google portal login", () => {
  it("existing googleSub match logs in normally, without a second (email) lookup", async () => {
    const { db, updateSets } = makeSequencedFakeDb([
      [{ id: 7, email: "student@example.com", firstName: "Amara", lastName: "Osei", googleSub: "google-sub-1", isActive: 1 }],
    ]);
    mockedGetDb.mockResolvedValue(db as any);

    const result = await findGoogleUser(GOOGLE_PROFILE);

    expect(result?.status).toBe("ok");
    if (result?.status === "ok") expect(result.user.id).toBe(7);
    expect(db.select).toHaveBeenCalledTimes(1);
    // Only the lastLogin write — no googleSub link needed, it was already set.
    expect(updateSets).toEqual([{ lastLogin: expect.any(Date) }]);
  });

  it("existing email match with no googleSub yet links this Google sub as a login method and logs in", async () => {
    const { db, updateSets } = makeSequencedFakeDb([
      [], // no match by googleSub
      [{ id: 9, email: "student@example.com", firstName: "Amara", lastName: "Osei", googleSub: null, isActive: 1 }],
    ]);
    mockedGetDb.mockResolvedValue(db as any);

    const result = await findGoogleUser(GOOGLE_PROFILE);

    expect(result?.status).toBe("ok");
    if (result?.status === "ok") expect(result.user.id).toBe(9);
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(updateSets).toContainEqual({ googleSub: "google-sub-1" });
  });

  it("no account matches by googleSub or email — returns not_found and creates nothing", async () => {
    const { db, updateSets } = makeSequencedFakeDb([[], []]);
    mockedGetDb.mockResolvedValue(db as any);

    const result = await findGoogleUser(GOOGLE_PROFILE);

    expect(result).toEqual({ status: "not_found" });
    expect(updateSets).toEqual([]);
    expect((db as any).insert).toBeUndefined();
  });

  it("an existing but deactivated account returns inactive, without logging in", async () => {
    const { db, updateSets } = makeSequencedFakeDb([
      [{ id: 3, email: "student@example.com", firstName: "Amara", lastName: "Osei", googleSub: "google-sub-1", isActive: 0 }],
    ]);
    mockedGetDb.mockResolvedValue(db as any);

    const result = await findGoogleUser(GOOGLE_PROFILE);

    expect(result).toEqual({ status: "inactive" });
    expect(updateSets).toEqual([]);
  });

  it("returns null when the database is unavailable", async () => {
    mockedGetDb.mockResolvedValue(undefined as any);

    const result = await findGoogleUser(GOOGLE_PROFILE);

    expect(result).toBeNull();
  });
});
