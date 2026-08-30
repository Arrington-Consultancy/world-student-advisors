import { describe, expect, it } from "vitest";
import { resolveCaseSource, mayStateCasePosition, HANDOVER_STAGE, HANDOVER_NOT_DEFINED } from "./caseSource";

describe("stages whose authoritative system is actually evidenced", () => {
  it("enquiry and triage resolve to Pipedrive, because that is where the sign-up form writes", () => {
    for (const stage of ["enquiry", "triage"]) {
      const d = resolveCaseSource(stage);
      expect(d.system).toBe("pipedrive");
      expect(d.ambiguous).toBe(false);
      expect(d.evidence).toContain("CRM");
    }
  });

  it("controlled records resolve to SharePoint, because that is where the governance library is", () => {
    const d = resolveCaseSource("controlled_record");
    expect(d.system).toBe("sharepoint");
    expect(d.ambiguous).toBe(false);
  });

  it("is not case- or whitespace-sensitive", () => {
    expect(resolveCaseSource("  ENQUIRY  ").system).toBe("pipedrive");
  });
});

describe("the handover point is not invented", () => {
  it("no handover stage is defined", () => {
    expect(HANDOVER_STAGE).toBeNull();
  });

  it("a stage after triage is ambiguous rather than guessed at", () => {
    for (const stage of ["application", "offer", "cas_issued", "visa", "pre_arrival", "enrolled"]) {
      const d = resolveCaseSource(stage);
      expect(d.ambiguous).toBe(true);
      expect(d.system).toBeNull();
    }
  });

  it("never silently defaults to either system", () => {
    const d = resolveCaseSource("some_stage_nobody_defined");
    expect(d.system).not.toBe("pipedrive");
    expect(d.system).not.toBe("sharepoint");
  });

  it("says plainly that defining it is a controlled-record decision", () => {
    expect(resolveCaseSource("offer").reason).toContain("controlled-record decision");
    expect(HANDOVER_NOT_DEFINED).toContain("Tom Arrington");
  });

  it("an empty stage establishes nothing", () => {
    expect(resolveCaseSource("").ambiguous).toBe(true);
  });
});

describe("stating a student's position", () => {
  it("is allowed only where the authoritative system is established", () => {
    expect(mayStateCasePosition("enquiry").allowed).toBe(true);
    expect(mayStateCasePosition("controlled_record").allowed).toBe(true);
  });

  it("is refused for an ambiguous stage, and says why reading the wrong system is the danger", () => {
    const outcome = mayStateCasePosition("visa");
    expect(outcome.allowed).toBe(false);
    // The point: the failure is silent, so it has to be blocked rather than detected.
    expect(outcome.reason).toContain("stale");
  });
});
