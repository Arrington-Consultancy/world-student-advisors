import { describe, expect, it, vi, beforeEach } from "vitest";
import { runConnectorAction } from "./shared";
import { clearAuditLog, getAuditLog } from "../audit";

beforeEach(() => {
  clearAuditLog();
});

const baseRequest = {
  workerId: "sophie" as const,
  connector: "sharepoint" as const,
  operation: "read" as const,
  resourceScope: "enquiry/12345",
  staffUserId: 1,
  authMethod: "entra_sso",
};

describe("runConnectorAction — permission gate", () => {
  it("denies before ever calling getState or attempt, for a worker with no connector authorisation (every worker, today)", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockResolvedValue({ success: true, message: "would have worked" });

    const result = await runConnectorAction(baseRequest, getState, attempt);

    expect(result.success).toBe(false);
    expect(getState).not.toHaveBeenCalled();
    expect(attempt).not.toHaveBeenCalled();
    expect(getAuditLog()).toHaveLength(1);
    expect(getAuditLog()[0].permissionDecision).toBe("denied");
  });
});

describe("runConnectorAction — connector state honesty (permission override for isolation)", () => {
  // The real, registry-backed permission engine denies every worker today
  // (see permissions.test.ts for that guarantee) — these tests inject a
  // permission override so the state/attempt/retry machinery itself can be
  // exercised in isolation. No production code path supplies an override;
  // runConnectorAction's default parameter is always the real engine.
  const allowOverride = () => ({ allowed: true, reason: "test override — permission engine is tested separately" });

  it("never claims success when the connector is unconfigured", async () => {
    const getState = vi.fn().mockReturnValue("unconfigured");
    const attempt = vi.fn();
    const result = await runConnectorAction(baseRequest, getState, attempt, allowOverride);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not configured/i);
    expect(attempt).not.toHaveBeenCalled();
    expect(result.copyableHandoff?.preservedWork).toMatch(/not attempted/i);
  });

  it("retries exactly once on a failed attempt before giving up", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockResolvedValue({ success: false, message: "transient error" });
    const result = await runConnectorAction(baseRequest, getState, attempt, allowOverride);
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(false);
    expect(result.copyableHandoff).toBeDefined();
  });

  it("does not retry when the first attempt succeeds", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockResolvedValue({ success: true, message: "done" });
    const result = await runConnectorAction(baseRequest, getState, attempt, allowOverride);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it("reports success only if the second retry actually succeeds", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi
      .fn()
      .mockResolvedValueOnce({ success: false, message: "first failure" })
      .mockResolvedValueOnce({ success: true, message: "second try worked" });
    const result = await runConnectorAction(baseRequest, getState, attempt, allowOverride);
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });

  it("catches a thrown error from attempt and reports it honestly rather than crashing or claiming success", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockRejectedValue(new Error("Graph API 503"));
    const result = await runConnectorAction(baseRequest, getState, attempt, allowOverride);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Graph API 503/);
  });

  it("logs an audit event for every outcome, success or failure", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockResolvedValue({ success: true, message: "done" });
    await runConnectorAction(baseRequest, getState, attempt, allowOverride);
    expect(getAuditLog()).toHaveLength(1);
    expect(getAuditLog()[0].success).toBe(true);
  });
});

describe("runConnectorAction — the real permission engine is always the default, never bypassed in production code", () => {
  it("without an override, denies exactly as permissions.test.ts proves for every worker today", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockResolvedValue({ success: true, message: "would have worked" });
    const result = await runConnectorAction(baseRequest, getState, attempt);
    expect(result.success).toBe(false);
    expect(attempt).not.toHaveBeenCalled();
  });
});
