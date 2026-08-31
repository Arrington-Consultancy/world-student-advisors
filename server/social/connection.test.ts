import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  evaluateWsaConnectAuthority,
  recordConnection,
  capabilitiesForWorker,
  NEVER_COLLECTED,
  ACTIVATION_STATE,
  CONNECTION_FLOW,
  type PlatformGrant,
  type SocialConnection,
} from "./connection";
import { MAP_ROLE, DECISION_FOR_TOM, ACCOUNT_ADMINISTRATION_MAP } from "./accountAdministration";
import { NIA_G03, NIA_G06, AUTHORITY_LAYERS } from "./gates";
import { HISTORICAL_MEMORY_POSITION, ESTABLISH_BEFORE_IMPORT } from "./historicalImport";
import type { StaffAccessProfile } from "../access/accessControl";

function profile(over: Partial<StaffAccessProfile> = {}): StaffAccessProfile {
  return {
    staffUserId: 7,
    baseAccessLevel: 1,
    functionalScopes: ["social_media"],
    caseScope: "organisation",
    actionPermissions: ["read", "credential_admin"],
    sensitiveOverlays: ["credentials_security"],
    temporaryGrants: [],
    status: "active",
    teamId: null,
    assignedByStaffUserId: null,
    assignedAt: null,
    assignmentReason: null,
    ...over,
  };
}

const grant: PlatformGrant = {
  platform: "linkedin",
  assetId: "urn:li:organization:123",
  assetName: "World Student Advisors",
  grantedScopes: ["r_organization_social", "w_organization_social"],
  authorisingPlatformUserRef: "urn:li:person:abc",
  grantedAt: "2026-09-01T10:00:00Z",
};

describe("the WSA internal gate stands on its own", () => {
  it("lets through a staff member who genuinely holds the authority", () => {
    expect(evaluateWsaConnectAuthority(profile()).allowed).toBe(true);
  });

  it("refuses an unauthenticated caller", () => {
    expect(evaluateWsaConnectAuthority(null).allowed).toBe(false);
  });

  it("refuses without the credentials_security overlay", () => {
    // Connecting an account hands WSA standing access to something
    // outside it. Read access must never imply that.
    expect(evaluateWsaConnectAuthority(profile({ sensitiveOverlays: [] })).allowed).toBe(false);
  });

  it("refuses without the credential_admin action", () => {
    expect(evaluateWsaConnectAuthority(profile({ actionPermissions: ["read"] })).allowed).toBe(false);
  });

  it("refuses without the social_media scope", () => {
    expect(evaluateWsaConnectAuthority(profile({ functionalScopes: ["marketing_seo"] })).allowed).toBe(false);
  });
});

describe("neither layer can stand in for the other", () => {
  it("refuses a platform-authorised person who lacks WSA permission", () => {
    // Being an admin on Meta or LinkedIn confers no WSA authority.
    const r = recordConnection({ profile: profile({ sensitiveOverlays: [] }), grant });
    expect(r.connected).toBe(false);
    if (!r.connected) expect(r.refusedBy).toBe("wsa_authority");
  });

  it("checks WSA authority first, so external admin is never the way in", () => {
    const r = recordConnection({ profile: null, grant });
    expect(r.connected).toBe(false);
    if (!r.connected) expect(r.refusedBy).toBe("wsa_authority");
  });

  it("refuses a WSA-authorised person with no platform grant", () => {
    // A WSA permission must never connect an account the platform did not
    // authorise this person to grant.
    const r = recordConnection({ profile: profile(), grant: null });
    expect(r.connected).toBe(false);
    if (!r.connected) expect(r.refusedBy).toBe("platform_authority");
  });

  it("refuses when the platform granted no scopes", () => {
    const r = recordConnection({ profile: profile(), grant: { ...grant, grantedScopes: [] } });
    expect(r.connected).toBe(false);
    if (!r.connected) expect(r.refusedBy).toBe("platform_authority");
  });

  it("records provenance, granted scopes and the connecting person when both hold", () => {
    const r = recordConnection({ profile: profile(), grant, now: new Date("2026-09-01T10:05:00Z") });
    expect(r.connected).toBe(true);
    if (r.connected) {
      expect(r.connection.connectedByStaffUserId).toBe(7);
      expect(r.connection.grantedScopes).toEqual(grant.grantedScopes);
      expect(r.connection.provenance).toContain("LinkedIn");
      expect(r.connection.provenance).toContain(grant.authorisingPlatformUserRef);
    }
  });
});

describe("a worker gets only the intersection", () => {
  const connection: SocialConnection = {
    platform: "linkedin",
    assetId: grant.assetId,
    assetName: grant.assetName,
    grantedScopes: ["r_organization_social"],
    connectedByStaffUserId: 7,
    connectedAt: "2026-09-01T10:05:00Z",
    provenance: "test",
    status: "active",
  };

  it("cannot exceed what the platform granted", () => {
    // The platform is the ceiling. Internal records cannot add to it.
    const caps = capabilitiesForWorker({
      workerId: "nia",
      connection,
      workerPermittedScopes: ["r_organization_social", "w_organization_social"],
      staffPermittedScopes: ["r_organization_social", "w_organization_social"],
      taskRequiredScopes: ["w_organization_social"],
    });
    expect(caps).toEqual([]);
  });

  it("cannot exceed what the worker's own record permits", () => {
    const caps = capabilitiesForWorker({
      workerId: "nia",
      connection,
      workerPermittedScopes: [],
      staffPermittedScopes: ["r_organization_social"],
      taskRequiredScopes: ["r_organization_social"],
    });
    expect(caps).toEqual([]);
  });

  it("cannot exceed what the staff member may exercise", () => {
    const caps = capabilitiesForWorker({
      workerId: "nia",
      connection,
      workerPermittedScopes: ["r_organization_social"],
      staffPermittedScopes: [],
      taskRequiredScopes: ["r_organization_social"],
    });
    expect(caps).toEqual([]);
  });

  it("gives nothing on a revoked connection", () => {
    const caps = capabilitiesForWorker({
      workerId: "nia",
      connection: { ...connection, status: "revoked" },
      workerPermittedScopes: ["r_organization_social"],
      staffPermittedScopes: ["r_organization_social"],
      taskRequiredScopes: ["r_organization_social"],
    });
    expect(caps).toEqual([]);
  });

  it("grants only what all four layers agree on", () => {
    const caps = capabilitiesForWorker({
      workerId: "nia",
      connection,
      workerPermittedScopes: ["r_organization_social"],
      staffPermittedScopes: ["r_organization_social"],
      taskRequiredScopes: ["r_organization_social"],
    });
    expect(caps).toEqual(["r_organization_social"]);
  });
});

describe("secrets that belong to the platform are never taken", () => {
  it("names them as never collected", () => {
    const joined = NEVER_COLLECTED.join(" ").toLowerCase();
    for (const term of ["password", "multi-factor", "recovery code"]) expect(joined).toContain(term);
  });

  it("has no field for a password, MFA code or recovery code", () => {
    const src = readFileSync("server/social/connection.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^[ \t]*\/\/.*$/gm, " ");
    for (const bad of [/\bpassword\s*[:?]/i, /\bmfa\w*\s*[:?]/i, /recoveryCode/i, /\botp\s*[:?]/i]) {
      expect(src).not.toMatch(bad);
    }
  });

  it("makes no network call, so building this activates nothing", () => {
    const src = readFileSync("server/social/connection.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^[ \t]*\/\/.*$/gm, " ");
    for (const bad of [/\bfetch\s*\(/, /axios/, /https?\.request/, /new\s+URL\s*\(/]) {
      expect(src).not.toMatch(bad);
    }
    expect(ACTIVATION_STATE.anyPlatformConnected).toBe(false);
  });

  it("describes the flow with the platform deciding the assets", () => {
    const flow = CONNECTION_FLOW.join(" ").toLowerCase();
    expect(flow).toContain("platform decides which accounts and assets");
    expect(flow).toContain("intersection");
  });
});

describe("the ownership map is not the technical gate", () => {
  it("says so, as data rather than as prose", () => {
    expect(MAP_ROLE.isTechnicalConnectionGate).toBe(false);
    expect(MAP_ROLE.technicalGate).toContain("platform's own authorisation");
  });

  it("still leaves every unevidenced field null", () => {
    for (const a of ACCOUNT_ADMINISTRATION_MAP) {
      expect(a.businessOwner).toBeNull();
      expect(a.humanAdministrators).toBeNull();
      expect(a.canGrantOrRevokeAccess).toBeNull();
      expect(a.continuityRiskIfIndividualLeaves).toBeNull();
      expect(a.sufficientOrganisationalControl).toBeNull();
      expect(a.unverified.length).toBeGreaterThan(0);
    }
  });

  it("no longer blocks the technical connection on the human answer", () => {
    expect(DECISION_FOR_TOM.doesNotBlock).toContain("Technical connection");
    expect(DECISION_FOR_TOM.doesBlock).toContain("continuity");
  });
});

describe("the gates are reassessed, not declared resolved", () => {
  it("keeps historical import blocked until a real connection exists", () => {
    expect(NIA_G03.state).toBe("partly_resolved");
    expect(HISTORICAL_MEMORY_POSITION.anyPlatformImportable).toBe(false);
    expect(NIA_G03.blocks.join(" ")).toContain("Importing any historical social data");
    expect(ESTABLISH_BEFORE_IMPORT.length).toBeGreaterThan(3);
  });

  it("still refuses to promise six years", () => {
    expect(HISTORICAL_MEMORY_POSITION.doNotSay).toContain("six years");
  });

  it("unblocks technical connection under G06 without resolving continuity", () => {
    expect(NIA_G06.doesNotBlock.join(" ")).toContain("technical connection");
    expect(NIA_G06.blocks.join(" ")).toContain("continuity risk");
    expect(NIA_G06.outstanding.length).toBeGreaterThan(0);
  });

  it("keeps the two authorities from substituting for each other", () => {
    expect(AUTHORITY_LAYERS.neverSubstituted).toContain("confers no WSA permission");
    expect(AUTHORITY_LAYERS.neverSubstituted).toContain("no platform authority");
  });
});
