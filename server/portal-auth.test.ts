import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

const { setPasswordWithToken } = await import("./portal-auth");
const { getDb } = await import("./db");
const mockedGetDb = vi.mocked(getDb);

/** Minimal fake drizzle client covering only the chains portal-auth.ts uses. */
function makeFakeDb(users: any[]) {
  return {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => users }) }) }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setPasswordWithToken — token expiry", () => {
  it("rejects a token whose expiry has already passed", async () => {
    const rawToken = "expired-token-value";
    const hashedToken = await bcrypt.hash(rawToken, 10);
    mockedGetDb.mockResolvedValue(
      makeFakeDb([
        {
          id: 1,
          email: "student@example.com",
          resetToken: hashedToken,
          resetTokenExpiry: new Date(Date.now() - 1000), // 1s in the past
        },
      ])
    );

    await expect(setPasswordWithToken("student@example.com", rawToken, "NewPassw0rd!")).resolves.toBe(false);
  });

  it("accepts a token still within its 24-hour expiry window", async () => {
    const rawToken = "valid-token-value";
    const hashedToken = await bcrypt.hash(rawToken, 10);
    mockedGetDb.mockResolvedValue(
      makeFakeDb([
        {
          id: 1,
          email: "student@example.com",
          resetToken: hashedToken,
          resetTokenExpiry: new Date(Date.now() + 60_000), // 1 minute in the future
        },
      ])
    );

    await expect(setPasswordWithToken("student@example.com", rawToken, "NewPassw0rd!")).resolves.toBe(true);
  });

  it("rejects a well-formed but incorrect token even if not expired", async () => {
    const hashedToken = await bcrypt.hash("the-real-token", 10);
    mockedGetDb.mockResolvedValue(
      makeFakeDb([
        {
          id: 1,
          email: "student@example.com",
          resetToken: hashedToken,
          resetTokenExpiry: new Date(Date.now() + 60_000),
        },
      ])
    );

    await expect(setPasswordWithToken("student@example.com", "a-guessed-token", "NewPassw0rd!")).resolves.toBe(false);
  });
});
