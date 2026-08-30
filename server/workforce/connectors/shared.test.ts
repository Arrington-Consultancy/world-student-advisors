import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { runConnectorAction } from "./shared";
import { clearAuditLog, getAuditLog } from "../audit";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  clearAuditLog();
  // The chokepoint checks the WSA boundary as well as the two permission
  // gates: a worker may only ever reach WSA's own material, decided from
  // server-controlled allowlists. These tests are about the state, attempt
  // and retry machinery that sits AFTER every gate, so the boundary is
  // satisfied here rather than bypassed — there is deliberately no way to
  // override it, unlike the permission gates below.
  process.env.SHAREPOINT_GRAPH_SITE_ID = "wsa-site";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const baseRequest = {
  workerId: "sophie" as const,
  connector: "sharepoint" as const,
  operation: "read" as const,
  resourceScope: "wsa-site/enquiry/12345",
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
  // Likewise for the staff access gate: it is tested in
  // server/access/enforcement.test.ts, and the tests below are about the
  // state/attempt/retry machinery that sits after both gates.
  const allowStaffOverride = async () => ({ allowed: true, reason: "test override — staff access gate is tested separately" });

  // These four are the only tests that can reach the WSA boundary at all.
  // Every worker is denied at the worker gate today, so in every other
  // test the boundary is never consulted — which means without these, the
  // check could be deleted from the chokepoint and the suite would still
  // pass. It was, during development, and it did.
  it("denies a resource outside the WSA boundary even when BOTH permission gates allow it", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockResolvedValue({ success: true, message: "would have worked" });
    const result = await runConnectorAction(
      { ...baseRequest, resourceScope: "arrington-site/Clients/confidential.docx" },
      getState, attempt, allowOverride, allowStaffOverride,
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("Arrington");
  });

  it("does not even check the connector's state for an out-of-scope resource", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn();
    await runConnectorAction(
      { ...baseRequest, resourceScope: "arrington-site/anything" },
      getState, attempt, allowOverride, allowStaffOverride,
    );
    expect(getState).not.toHaveBeenCalled();
    expect(attempt).not.toHaveBeenCalled();
  });

  it("audits an out-of-scope refusal as a permission denial with the resource named", async () => {
    await runConnectorAction(
      { ...baseRequest, resourceScope: "arrington-site/anything" },
      vi.fn().mockReturnValue("operational"), vi.fn(), allowOverride, allowStaffOverride,
    );
    const [event] = getAuditLog();
    expect(event.permissionDecision).toBe("denied");
    expect(event.errorCategory).toBe("permission_denied");
    expect(event.targetResourceId).toBe("arrington-site/anything");
  });

  it("allows a resource inside the WSA boundary through to the attempt", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockResolvedValue({ success: true, message: "done" });
    const result = await runConnectorAction(baseRequest, getState, attempt, allowOverride, allowStaffOverride);
    expect(result.success).toBe(true);
    expect(attempt).toHaveBeenCalled();
  });

  it("never claims success when the connector is unconfigured", async () => {
    const getState = vi.fn().mockReturnValue("unconfigured");
    const attempt = vi.fn();
    const result = await runConnectorAction(baseRequest, getState, attempt, allowOverride, allowStaffOverride);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not configured/i);
    expect(attempt).not.toHaveBeenCalled();
    expect(result.copyableHandoff?.preservedWork).toMatch(/not attempted/i);
  });

  it("retries exactly once on a failed attempt before giving up", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockResolvedValue({ success: false, message: "transient error" });
    const result = await runConnectorAction(baseRequest, getState, attempt, allowOverride, allowStaffOverride);
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(false);
    expect(result.copyableHandoff).toBeDefined();
  });

  it("does not retry when the first attempt succeeds", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockResolvedValue({ success: true, message: "done" });
    const result = await runConnectorAction(baseRequest, getState, attempt, allowOverride, allowStaffOverride);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it("reports success only if the second retry actually succeeds", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi
      .fn()
      .mockResolvedValueOnce({ success: false, message: "first failure" })
      .mockResolvedValueOnce({ success: true, message: "second try worked" });
    const result = await runConnectorAction(baseRequest, getState, attempt, allowOverride, allowStaffOverride);
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });

  it("catches a thrown error from attempt and reports it honestly rather than crashing or claiming success", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockRejectedValue(new Error("Graph API 503"));
    const result = await runConnectorAction(baseRequest, getState, attempt, allowOverride, allowStaffOverride);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Graph API 503/);
  });

  it("logs an audit event for every outcome, success or failure", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockResolvedValue({ success: true, message: "done" });
    await runConnectorAction(baseRequest, getState, attempt, allowOverride, allowStaffOverride);
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


describe("runConnectorAction — the signed-in staff member's own access is a separate, additional gate", () => {
  // Access Control Standard §1: a worker being authorised for a connector
  // must never let it fetch something the person asking may not see.
  const allowWorker = () => ({ allowed: true, reason: "test override — worker gate tested separately" });

  it("denies when the staff gate refuses, even though the worker gate passed", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockResolvedValue({ success: true, message: "would have worked" });
    const denyStaff = async () => ({ allowed: false, reason: "Functional scope is not granted to this staff member." });

    const result = await runConnectorAction(baseRequest, getState, attempt, allowWorker, denyStaff);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not granted/i);
    expect(getState).not.toHaveBeenCalled();
    expect(attempt).not.toHaveBeenCalled();
  });

  it("audits a staff-gate denial as a denial, with no connector attempt recorded", async () => {
    const denyStaff = async () => ({ allowed: false, reason: "Staff account status is \"disabled\", not active." });
    await runConnectorAction(baseRequest, vi.fn().mockReturnValue("operational"), vi.fn(), allowWorker, denyStaff);

    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].permissionDecision).toBe("denied");
    expect(log[0].success).toBeNull();
    expect(log[0].errorCategory).toBe("permission_denied");
  });

  it("reports the worker gate first when both refuse, since nothing is open to anyone", async () => {
    const denyWorker = () => ({ allowed: false, reason: "Sophie is not authorised for any connector action." });
    const denyStaff = vi.fn();
    const result = await runConnectorAction(baseRequest, vi.fn(), vi.fn(), denyWorker, denyStaff as never);
    expect(result.message).toMatch(/not authorised for any connector action/);
    expect(denyStaff).not.toHaveBeenCalled();
  });

  it("uses the real staff gate by default, which denies without a resolved access assignment", async () => {
    // No database is configured in this environment, so the real resolver
    // fails closed — which is the assertion: the default is the real gate,
    // and the real gate denies rather than waving the action through.
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn().mockResolvedValue({ success: true, message: "would have worked" });
    const result = await runConnectorAction(baseRequest, getState, attempt, allowWorker);
    expect(result.success).toBe(false);
    expect(attempt).not.toHaveBeenCalled();
  });

  it("denies a shared-password session, which carries no individual identity to assign access to", async () => {
    const getState = vi.fn().mockReturnValue("operational");
    const attempt = vi.fn();
    const result = await runConnectorAction(
      { ...baseRequest, staffUserId: null, authMethod: "shared_password" },
      getState,
      attempt,
      allowWorker,
    );
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/individual staff identity/i);
    expect(attempt).not.toHaveBeenCalled();
  });
});
