import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The write itself, not the comparison.
 *
 * A separate file because this needs the database mocked, and because the
 * property it proves is different from the one sessionVersion.test.ts proves.
 * That file shows a token is refused once the account's version moves. This
 * one shows the increment lands on exactly one row.
 *
 * IT EXISTS BECAUSE A MUTATION SURVIVED. Deleting the .where() clause from
 * endSessionsFor, which would bump every staff account in the table and sign
 * the entire company out, passed the whole suite. The per-user test there
 * mocks the row that is read back, so it never touched the update at all.
 * A control that says "this affects one person" is only as good as the
 * clause that makes it true.
 */

const mockDb = { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
const mockGetDb = vi.fn(async () => mockDb as any);
vi.mock("../db", () => ({ getDb: mockGetDb }));

const recordMaterialAuditEvent = vi.fn(async () => ({ durablyStored: true }));
vi.mock("../workforce/audit", () => ({ recordMaterialAuditEvent }));

const { endSessionsFor } = await import("./sessionRevocation");

const whereSpy = vi.fn(async () => undefined);
const setSpy = vi.fn(() => ({ where: whereSpy }));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDb.mockResolvedValue(mockDb as any);
  mockDb.update.mockReturnValue({ set: setSpy });
});

describe("ending sessions touches one account and no other", () => {
  it("scopes the increment with a WHERE clause", async () => {
    // The mutation that got through: without this the UPDATE has no
    // predicate and every staff account in the table is bumped.
    await endSessionsFor(7, "administrator_revocation");
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(whereSpy.mock.calls[0][0]).toBeTruthy();
  });

  it("increments relative to the stored value rather than writing a computed number", async () => {
    // Read-then-write would let two revocations racing each other both read
    // the same version and write the same one back, leaving a session alive
    // that both meant to cut. The SET must be an expression, not a literal.
    await endSessionsFor(7, "password_reset");
    const written = setSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(written)).toEqual(["sessionVersion"]);
    expect(typeof written.sessionVersion).toBe("object");
  });

  it("writes an audit line naming the account and the trigger", async () => {
    // §9: high-risk actions logged with who, what, when and reason.
    await endSessionsFor(7, "account_status_change");
    expect(recordMaterialAuditEvent).toHaveBeenCalledTimes(1);
    const event = recordMaterialAuditEvent.mock.calls[0][0] as Record<string, unknown>;
    expect(event.staffUserId).toBe(7);
    expect(event.targetResourceId).toBe("staff_user:7");
    expect(event.requestedCapability).toBe("staff_session_end");
    expect(String(event.permissionReason)).toMatch(/suspended or disabled/i);
  });

  it("gives each trigger its own recorded reason", async () => {
    await endSessionsFor(7, "password_reset");
    await endSessionsFor(7, "administrator_revocation");
    const reasons = recordMaterialAuditEvent.mock.calls.map(
      c => (c[0] as Record<string, unknown>).permissionReason,
    );
    expect(new Set(reasons).size).toBe(2);
  });

  it("does nothing at all when the database is unavailable", async () => {
    mockGetDb.mockResolvedValue(null as never);
    const result = await endSessionsFor(7, "password_reset");
    expect(result.ended).toBe(false);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
