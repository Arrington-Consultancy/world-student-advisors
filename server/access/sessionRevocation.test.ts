import { describe, expect, it } from "vitest";
import { evaluateAccess, type StaffAccessProfile } from "./accessControl";
import { REVOKE_ACTION, REVOKE_SCOPE } from "./sessionRevocation";
import {
  SESSION_REVOCATION_REASONS,
  type SessionRevocationTrigger,
} from "../../shared/sessionVersion";

/**
 * Who may end somebody else's sessions.
 *
 * Staff Portal Access Control Standard v1.0 §6 defines CREDENTIAL ADMIN as
 * managing "API keys, passwords, tokens, MFA or secrets" and says it "is
 * never inherited from ordinary Level 1 business access". §3 says Level 1
 * "must not be implemented as a magic 'can do anything' flag". Ending a
 * session is token management, so these tests exist to prove seniority alone
 * never buys it.
 */

function profile(over: Partial<StaffAccessProfile> = {}): StaffAccessProfile {
  return {
    staffUserId: 1,
    baseAccessLevel: 1,
    functionalScopes: ["executive", "technical_administration"],
    caseScope: "organisation",
    actionPermissions: ["read"],
    sensitiveOverlays: [],
    temporaryGrants: [],
    status: "active",
    teamId: null,
    assignedByStaffUserId: null,
    assignedAt: null,
    assignmentReason: null,
    ...over,
  };
}

const request = { action: REVOKE_ACTION, functionalScope: REVOKE_SCOPE };

describe("revoking sessions is credential_admin, not seniority", () => {
  it("is wired to credential_admin inside technical_administration", () => {
    // Asserted on the constants the endpoint actually passes, so a later
    // change to something weaker fails here rather than silently widening.
    expect(REVOKE_ACTION).toBe("credential_admin");
    expect(REVOKE_SCOPE).toBe("technical_administration");
  });

  it("REFUSES a Level 1 executive who does not hold credential_admin", () => {
    // The governance test. Full business visibility, top level, right scope,
    // and still no authority to end anybody's session.
    const decision = evaluateAccess(profile({ baseAccessLevel: 1 }), request);
    expect(decision.allowed).toBe(false);
  });

  it("REFUSES somebody holding access_admin but not credential_admin", () => {
    // §6 lists them separately. Being able to change roles is not being able
    // to manage tokens, and the person who assigns access is often not the
    // person who should be able to cut sessions.
    const decision = evaluateAccess(
      profile({ actionPermissions: ["read", "access_admin"] }),
      request,
    );
    expect(decision.allowed).toBe(false);
  });

  it("ALLOWS somebody explicitly granted credential_admin in that scope", () => {
    const decision = evaluateAccess(
      profile({ actionPermissions: ["read", "credential_admin"] }),
      request,
    );
    expect(decision.allowed).toBe(true);
  });

  it("REFUSES credential_admin held outside technical_administration", () => {
    const decision = evaluateAccess(
      profile({
        actionPermissions: ["read", "credential_admin"],
        functionalScopes: ["admissions"],
      }),
      request,
    );
    expect(decision.allowed).toBe(false);
  });

  it("REFUSES a suspended or disabled administrator", () => {
    for (const status of ["suspended", "disabled"] as const) {
      const decision = evaluateAccess(
        profile({ actionPermissions: ["read", "credential_admin"], status }),
        request,
      );
      expect(decision.allowed).toBe(false);
    }
  });
});

describe("every trigger has a reason the audit log can carry", () => {
  it("names all three, so no session ends without a recorded why", () => {
    const triggers: SessionRevocationTrigger[] = [
      "password_reset",
      "account_status_change",
      "administrator_revocation",
    ];
    for (const trigger of triggers) {
      expect(SESSION_REVOCATION_REASONS[trigger]).toBeTruthy();
      expect(SESSION_REVOCATION_REASONS[trigger].length).toBeGreaterThan(20);
    }
    expect(new Set(Object.values(SESSION_REVOCATION_REASONS)).size).toBe(3);
  });
});
