import { describe, expect, it } from "vitest";
import { evaluateStaffCapability } from "./staffRBAC";

describe("staffRBAC — authentication and authorisation are separate", () => {
  it("an unauthenticated principal is denied every capability, including bare portal access", () => {
    const result = evaluateStaffCapability({ authenticated: false }, "staff_portal_access");
    expect(result.allowed).toBe(false);
    expect(result.pendingGovernance).toBe(false);
  });

  it("a valid session alone grants staff_portal_access and view_workforce_status", () => {
    expect(evaluateStaffCapability({ authenticated: true }, "staff_portal_access").allowed).toBe(true);
    expect(evaluateStaffCapability({ authenticated: true }, "view_workforce_status").allowed).toBe(true);
  });

  it("a valid session does NOT automatically grant permission to open any given worker", () => {
    const result = evaluateStaffCapability({ authenticated: true }, { kind: "open_worker", workerId: "sophie" });
    expect(result.allowed).toBe(false);
    expect(result.pendingGovernance).toBe(true);
  });

  it("a valid session does NOT automatically grant view_student_data, connector_write, approval_authority or admin", () => {
    for (const capability of ["view_student_data", "connector_write", "approval_authority", "admin"] as const) {
      const result = evaluateStaffCapability({ authenticated: true }, capability);
      expect(result.allowed).toBe(false);
      expect(result.pendingGovernance).toBe(true);
    }
  });

  it("every undefined capability is honestly marked pendingGovernance rather than silently denied as a considered decision", () => {
    const result = evaluateStaffCapability({ authenticated: true }, "admin");
    expect(result.reason).toMatch(/no controlled wsa staff-role mapping/i);
  });
});
