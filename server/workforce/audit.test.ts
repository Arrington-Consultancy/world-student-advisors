import { describe, expect, it, beforeEach } from "vitest";
import { recordAuditEvent, getAuditLog, clearAuditLog } from "./audit";

beforeEach(() => {
  clearAuditLog();
});

describe("audit framework", () => {
  it("records an event with a generated timestamp", () => {
    recordAuditEvent({
      staffIdentity: "staff-session",
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
      staffIdentity: "staff-session-42",
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
      staffIdentity: "staff-session",
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
      staffIdentity: "staff-session",
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
      staffIdentity: "staff-session",
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
        staffIdentity: "",
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
