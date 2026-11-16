import { describe, expect, it, vi, beforeEach } from "vitest";

const mockDb = { insert: vi.fn() };
const mockGetDb = vi.fn(async () => mockDb as any);
vi.mock("../db", () => ({ getDb: mockGetDb }));

const { recordAuditEvent, getAuditLog, clearAuditLog, persistAuditEventDurably, recordMaterialAuditEvent } = await import("./audit");

beforeEach(() => {
  clearAuditLog();
  vi.clearAllMocks();
  mockGetDb.mockResolvedValue(mockDb as any);
  mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
});

const baseEvent = {
  staffUserId: 1,
  authMethod: "entra_sso" as const,
  workerId: "sophie" as const,
  workerSpecificationVersion: "v1.1",
  requestedCapability: "sharepoint:read",
  permissionDecision: "denied" as const,
  permissionReason: "not authorised",
  success: null,
  errorCategory: "permission_denied" as const,
};

describe("durable audit persistence", () => {
  it("writes the event to the workforce_audit_events table when the database is available", async () => {
    await persistAuditEventDurably({ ...baseEvent, timestamp: new Date().toISOString() });
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it("is a silent no-op when no database is configured", async () => {
    mockGetDb.mockResolvedValue(null as any);
    await expect(persistAuditEventDurably({ ...baseEvent, timestamp: new Date().toISOString() })).resolves.toBeUndefined();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("swallows a database error rather than throwing — a persistence failure must not surface to the caller", async () => {
    mockDb.insert.mockReturnValue({ values: vi.fn().mockRejectedValue(new Error("connection reset")) });
    await expect(persistAuditEventDurably({ ...baseEvent, timestamp: new Date().toISOString() })).resolves.toBeUndefined();
  });

  it("converts the tri-state success (true/false/null) to the table's int-or-null column correctly", async () => {
    const valuesSpy = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values: valuesSpy });

    await persistAuditEventDurably({ ...baseEvent, success: true, timestamp: new Date().toISOString() });
    expect(valuesSpy.mock.calls[0][0].success).toBe(1);

    await persistAuditEventDurably({ ...baseEvent, success: false, timestamp: new Date().toISOString() });
    expect(valuesSpy.mock.calls[1][0].success).toBe(0);

    await persistAuditEventDurably({ ...baseEvent, success: null, timestamp: new Date().toISOString() });
    expect(valuesSpy.mock.calls[2][0].success).toBeNull();
  });

  it("recordAuditEvent triggers durable persistence without the caller needing to await it", async () => {
    recordAuditEvent(baseEvent);
    // Give the fire-and-forget persistence a tick to run.
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});

describe("recordMaterialAuditEvent — the future material-write contract reports durable storage honestly", () => {
  it("reports durablyStored: true only when the database write actually succeeds", async () => {
    const result = await persistMaterial();
    expect(result.durablyStored).toBe(true);
  });

  it("reports durablyStored: false when no database is configured — never a fake confirmation", async () => {
    mockGetDb.mockResolvedValue(null as any);
    const result = await persistMaterial();
    expect(result.durablyStored).toBe(false);
  });

  it("reports durablyStored: false on a database error, still without throwing", async () => {
    mockDb.insert.mockReturnValue({ values: vi.fn().mockRejectedValue(new Error("connection reset")) });
    const result = await persistMaterial();
    expect(result.durablyStored).toBe(false);
  });

  it("always keeps the in-process record even when durable storage fails", async () => {
    mockGetDb.mockResolvedValue(null as any);
    await persistMaterial();
    expect(getAuditLog()).toHaveLength(1);
  });

  async function persistMaterial() {
    return recordMaterialAuditEvent({ ...baseEvent, requestedCapability: "sharepoint:update", success: true, errorCategory: "none" });
  }
});

describe("audit framework", () => {
  it("records an event with a generated timestamp", () => {
    recordAuditEvent({
      staffUserId: 1,
      authMethod: "entra_sso",
      workerId: "sophie",
      workerSpecificationVersion: "v1.1",
      requestedCapability: "sharepoint:read",
      permissionDecision: "denied",
      permissionReason: "not authorised",
      success: null,
      errorCategory: "permission_denied",
    });
    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].timestamp).toBeTruthy();
    expect(new Date(log[0].timestamp).toString()).not.toBe("Invalid Date");
  });

  it("another authorised staff member can understand what happened from the record alone", () => {
    recordAuditEvent({
      staffUserId: 42,
      authMethod: "entra_sso",
      workerId: "priya",
      workerSpecificationVersion: "v0.2",
      caseId: "case-123",
      requestedCapability: "sharepoint:update",
      permissionDecision: "denied",
      permissionReason: "Priya is not authorised for write/update actions.",
      connector: "sharepoint",
      connectorOperation: "update",
      success: false,
      targetResourceId: "case-123/visa-evidence.docx",
      errorCategory: "permission_denied",
    });
    const [event] = getAuditLog();
    expect(event.workerId).toBe("priya");
    expect(event.caseId).toBe("case-123");
    expect(event.permissionReason).toMatch(/not authorised/i);
    expect(event.errorCategory).toBe("permission_denied");
  });

  it("redacts a bearer-token-shaped value from free-text fields before storage", () => {
    recordAuditEvent({
      staffUserId: 1,
      authMethod: "entra_sso",
      workerId: "maya",
      workerSpecificationVersion: "v0.2",
      requestedCapability: "sharepoint:read",
      permissionDecision: "denied",
      permissionReason: "leaked token in error: Bearer abc123def456ghi789jklmno",
      success: false,
      errorCategory: "connector_error",
    });
    const [event] = getAuditLog();
    expect(event.permissionReason).not.toMatch(/abc123def456ghi789jklmno/);
    expect(event.permissionReason).toContain("[redacted]");
  });

  it("redacts a long opaque secret-shaped string from targetResourceId", () => {
    recordAuditEvent({
      staffUserId: 1,
      authMethod: "entra_sso",
      workerId: "maya",
      workerSpecificationVersion: "v0.2",
      requestedCapability: "sharepoint:read",
      permissionDecision: "denied",
      permissionReason: "ok",
      targetResourceId: "sk-abcdefghijklmnopqrstuvwx1234",
      success: false,
      errorCategory: "connector_error",
    });
    const [event] = getAuditLog();
    expect(event.targetResourceId).toBe("[redacted]");
  });

  it("the AuditEvent type has no field for a password, token, API key or secret value — the compiler rejects one", () => {
    // @ts-expect-error — there is no `apiKey` field on the recordAuditEvent parameter type
    recordAuditEvent({
      staffUserId: 1,
      authMethod: "entra_sso",
      workerId: "sophie",
      workerSpecificationVersion: "v1.1",
      requestedCapability: "x",
      permissionDecision: "denied",
      permissionReason: "x",
      success: null,
      errorCategory: "none",
      apiKey: "should not be assignable",
    });
  });

  it("never throws even if called with malformed input", () => {
    expect(() =>
      recordAuditEvent({
        staffUserId: null,
        authMethod: "shared_password",
        workerId: "sophie",
        workerSpecificationVersion: "",
        requestedCapability: "",
        permissionDecision: "denied",
        permissionReason: "",
        success: null,
        errorCategory: "none",
      }),
    ).not.toThrow();
  });
});
