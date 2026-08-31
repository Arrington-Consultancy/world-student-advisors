import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  HOOK_FORMAT_PATTERNS,
  HOOK_FORMAT_LIBRARY,
  validatePattern,
  type HookFormatPattern,
} from "./hookFormatLibrary";
import {
  referencePaidEvidenceForContent,
  alexAuthorisesRelease,
  NIA_PAID_BOUNDARY,
  NO_VERIFIED_PAID_EVIDENCE,
  INTERFACE_RECORD,
} from "./paidEvidence";
import { PLATFORM_IMPORT_POSITIONS, HISTORICAL_MEMORY_POSITION, PROHIBITED_BACKFILL } from "./historicalImport";
import { ACCOUNT_ADMINISTRATION_MAP, VERIFIED_POSITION, DECISION_FOR_TOM } from "./accountAdministration";
import type { StaffAccessProfile } from "../access/accessControl";

function profile(over: Partial<StaffAccessProfile> = {}): StaffAccessProfile {
  return {
    staffUserId: 1,
    baseAccessLevel: 1,
    functionalScopes: ["paid_media"],
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

const soundPattern: HookFormatPattern = {
  patternId: "HF-001",
  patternType: "hook",
  platformAccount: "Facebook: World Student Advisors Student Support Centre",
  audienceSegment: "Nigeria, parents of taught postgraduate applicants",
  description: "Opening on a cost figure the reader can check.",
  supportingContentIds: ["C-101", "C-140", "C-166"],
  supportingEvidence: ["Facebook Page Insights, 3s video views, exported 12 Jan 2027"],
  observedEffect: "Higher early retention than the account median.",
  confidence: "high",
  counterEvidence: ["C-152 used the same opening and underperformed."],
  derivedFrom: "verified_future_evidence",
  firstObserved: "2027-01-12",
  lastRevalidated: "2027-01-12",
  revalidationTrigger: "Six months, or a platform format change.",
  status: "supported",
};

describe("Hook & Format Library is a real controlled record", () => {
  it("is a record with declared fields, not UI text", () => {
    // The failure this guards against is the library existing only as a
    // label on a page, which is what a "code-only concept" means here.
    expect(HOOK_FORMAT_LIBRARY.name).toBe("Hook & Format Library");
    expect(HOOK_FORMAT_LIBRARY.briefSection).toBe("§8");
    expect(HOOK_FORMAT_LIBRARY.controlPackSection).toContain("§10");
    expect(Array.isArray(HOOK_FORMAT_PATTERNS)).toBe(true);
    expect(typeof validatePattern).toBe("function");
  });

  it("states its working-draft status rather than implying approval", () => {
    expect(HOOK_FORMAT_LIBRARY.status).toContain("NOT APPROVED");
  });

  it("accepts a pattern that carries full provenance", () => {
    expect(validatePattern(soundPattern)).toEqual({ valid: true });
  });

  it("rejects a pattern with no post behind it", () => {
    const r = validatePattern({ ...soundPattern, supportingContentIds: [] });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reasons.join(" ")).toContain("Content ID");
  });

  it("rejects a pattern with no measured evidence", () => {
    const r = validatePattern({ ...soundPattern, supportingEvidence: [] });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reasons.join(" ")).toContain("evidence");
  });

  it("rejects high confidence built on a single post", () => {
    const r = validatePattern({ ...soundPattern, supportingContentIds: ["C-101"] });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reasons.join(" ")).toContain("universal rule");
  });

  it("rejects a pattern that can never expire", () => {
    const r = validatePattern({ ...soundPattern, revalidationTrigger: "  " });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reasons.join(" ")).toContain("folklore");
  });

  it("is empty, and says the emptiness is the rule working", () => {
    expect(HOOK_FORMAT_PATTERNS).toHaveLength(0);
    expect(HOOK_FORMAT_LIBRARY.populated).toBe(false);
    expect(HOOK_FORMAT_LIBRARY.emptyReason).toContain("no posts");
  });
});

describe("Nia may reference Alex's paid evidence but cannot mutate it", () => {
  it("exposes no function that writes, spends, budgets or boosts", () => {
    // Strip comments first: the module explains what it refuses to do, and
    // matching that prose would pass while a real helper slipped through.
    const src = readFileSync("server/social/paidEvidence.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^[ \t]*\/\/.*$/gm, " ");
    for (const forbidden of [
      /export\s+(async\s+)?function\s+\w*(create|update|delete|set|spend|budget|boost|optimis|pause|activate)/i,
      /export\s+const\s+\w*(create|update|delete|spend|budget|boost)\w*\s*=\s*(async\s*)?\(/i,
    ]) {
      expect(src).not.toMatch(forbidden);
    }
  });

  it("refuses release while Alex is not approved", () => {
    expect(alexAuthorisesRelease()).toBe(false);
    const r = referencePaidEvidenceForContent({ profile: profile(), contentId: "C-101" });
    expect(r.available).toBe(false);
    if (!r.available) {
      expect(r.deniedBy).toBe("worker_release");
      expect(r.reason).toContain("Paid measurement remains his");
    }
  });

  it("approving the interface does not open Alex's gate", () => {
    // The distinction the approval turns on: it approves the boundary,
    // not the data. Alex is still not approved, so nothing is released,
    // and an approved interface must never be read as an approved worker.
    expect(INTERFACE_RECORD.status).toBe("APPROVED");
    expect(alexAuthorisesRelease()).toBe(false);
    expect(INTERFACE_RECORD.whatApprovalDoesNotDo).toContain("does not approve Alex");
    expect(INTERFACE_RECORD.whatApprovalDoesNotDo).toContain("AB-A01");
    const r = referencePaidEvidenceForContent({ profile: profile(), contentId: "C-101" });
    expect(r.available).toBe(false);
  });

  it("keeps Alex the owner of paid-media measurement", () => {
    expect(NIA_PAID_BOUNDARY.owner).toContain("Alex");
    expect(NIA_PAID_BOUNDARY.mayNot).toContain("Become the source of truth for paid performance");
    expect(NIA_PAID_BOUNDARY.mayNot).toContain("Set budgets");
    expect(NIA_PAID_BOUNDARY.mayNot).toContain("Spend money");
  });

  it("still lets her record a boost as a confounder, which the Pack already allows", () => {
    expect(NIA_PAID_BOUNDARY.mayRecord).toContain("confounder");
  });
});

describe("unauthorised staff cannot obtain paid evidence through Nia", () => {
  it("refuses a staff member with no paid_media scope, at the staff gate", () => {
    const r = referencePaidEvidenceForContent({
      profile: profile({ functionalScopes: ["social_media"] }),
      contentId: "C-101",
    });
    expect(r.available).toBe(false);
    // The staff gate must be reached first. If the worker gate answered
    // first, widening Alex later would silently open a side door for
    // people who cannot see paid data directly.
    if (!r.available) expect(r.deniedBy).toBe("staff_access");
  });

  it("refuses an unauthenticated caller", () => {
    const r = referencePaidEvidenceForContent({ profile: null, contentId: "C-101" });
    expect(r.available).toBe(false);
    if (!r.available) expect(r.deniedBy).toBe("staff_access");
  });

  it("refuses a staff member whose access level does not reach the data class", () => {
    // business_analytics needs level 2 or better. A level 5 counsellor
    // holding the scope still cannot see paid performance.
    const r = referencePaidEvidenceForContent({
      profile: profile({ baseAccessLevel: 5, caseScope: "own_applicants" }),
      contentId: "C-101",
    });
    expect(r.available).toBe(false);
    if (!r.available) expect(r.deniedBy).toBe("staff_access");
  });

  it("refuses a suspended staff member who holds the scope on paper", () => {
    const r = referencePaidEvidenceForContent({ profile: profile({ status: "suspended" }), contentId: "C-101" });
    expect(r.available).toBe(false);
    if (!r.available) expect(r.deniedBy).toBe("staff_access");
  });

  it("has nothing verified to release even when both gates would open", () => {
    expect(NO_VERIFIED_PAID_EVIDENCE).toContain("unverified");
  });
});

describe("historical memory separates verified data from unavailable history", () => {
  it("records no importable range on any platform", () => {
    expect(PLATFORM_IMPORT_POSITIONS.length).toBeGreaterThan(0);
    for (const p of PLATFORM_IMPORT_POSITIONS) {
      expect(p.verifiedRange).toBeNull();
      expect(p.method.kind).toBe("none");
      expect(p.blockers.length).toBeGreaterThan(0);
    }
    expect(HISTORICAL_MEMORY_POSITION.anyPlatformImportable).toBe(false);
  });

  it("leaves recoverable fields null rather than guessing what a platform returns", () => {
    for (const p of PLATFORM_IMPORT_POSITIONS) expect(p.fieldsRecoverable).toBeNull();
  });

  it("refuses to claim six years", () => {
    expect(HISTORICAL_MEMORY_POSITION.doNotSay).toContain("six years");
    expect(HISTORICAL_MEMORY_POSITION.verifiedRangeAcrossEstate).toBeNull();
  });

  it("names inference and scraping as prohibited rather than merely undone", () => {
    const joined = PROHIBITED_BACKFILL.join(" ").toLowerCase();
    expect(joined).toContain("inferring");
    expect(joined).toContain("scraping");
    expect(joined).toContain("buying");
  });
});

describe("account administration is not inferred", () => {
  it("leaves every unevidenced field null with a stated reason", () => {
    for (const a of ACCOUNT_ADMINISTRATION_MAP) {
      expect(a.businessOwner).toBeNull();
      expect(a.humanAdministrators).toBeNull();
      expect(a.recoveryDependencies).toBeNull();
      expect(a.managementModel).toBe("unknown");
      expect(a.sufficientOrganisationalControl).toBeNull();
      expect(a.canGrantOrRevokeAccess).toBeNull();
      expect(a.continuityRiskIfIndividualLeaves).toBeNull();
      expect(a.unverified.length).toBeGreaterThan(0);
    }
  });

  it("records the account identity that was verified, with its evidence", () => {
    for (const a of ACCOUNT_ADMINISTRATION_MAP) {
      expect(a.account.trim().length).toBeGreaterThan(0);
      expect(a.accountEvidence).toMatch(/socialLinks\.ts|Contact page/);
    }
  });

  it("states zero technical access as a positive verified finding", () => {
    expect(VERIFIED_POSITION.technicalAccessHeld).toBe(0);
    expect(VERIFIED_POSITION.accountsIdentified).toBe(ACCOUNT_ADMINISTRATION_MAP.length);
  });

  it("puts one decision to a person, and records that nothing was changed", () => {
    expect(DECISION_FOR_TOM.decision).toContain("business manager");
    expect(DECISION_FOR_TOM.recommendedMinimumChange).toContain("Do not change");
    expect(DECISION_FOR_TOM.changedByThisInspection).toContain("Nothing");
  });
});

describe("empty states stay honest", () => {
  it("never presents an empty store as a populated one", () => {
    expect(HOOK_FORMAT_LIBRARY.populated).toBe(false);
    expect(HISTORICAL_MEMORY_POSITION.anyPlatformImportable).toBe(false);
    expect(HOOK_FORMAT_PATTERNS).toHaveLength(0);
  });
});
