import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  MAY_INTAKE_RECORDS, MAY_INTAKE_PROVENANCE,
  PARTNER_INSTITUTIONS, PARTNER_PROVENANCE, PARTNER_AREA_MUST_NOT_HOLD,
  MESSAGE_TEMPLATES, TRAINING_RESOURCES, TEMPLATES_PROVENANCE,
  DEFERRED_BY_STAFF_REQUEST, isAwaitingContent,
} from "./controlledResources";

const source = readFileSync(path.resolve(import.meta.dirname, "./controlledResources.ts"), "utf8");

/**
 * These areas were asked for on 1 September 2026 with their content to
 * follow. Empty is the correct state, and these tests exist because the
 * tempting failure is to make the page look finished.
 *
 * An invented university, a plausible intake date or a constructed agent
 * portal URL is indistinguishable from a real one on screen, and a
 * counsellor would repeat it to a student.
 */
describe("May intake area: structure without invented content", () => {
  it("holds no universities, courses, intakes or dates", () => {
    expect(MAY_INTAKE_RECORDS).toHaveLength(0);
    expect(isAwaitingContent(MAY_INTAKE_RECORDS)).toBe(true);
  });

  it("names who is supplying it, so the empty area is explained", () => {
    expect(MAY_INTAKE_PROVENANCE.suppliedBy).toBe("Eldah");
    expect(MAY_INTAKE_PROVENANCE.awaiting).toMatch(/not yet available/i);
  });

  it("the record shape can carry the controlled facts a future entry needs", () => {
    // Asserted against the type's own text: every field staff asked for is
    // required, so a half-record cannot be added later without noticing.
    for (const field of [
      "university", "courseOrCourseGroup", "intake", "academicYear", "officialSource", "lastChecked",
    ]) {
      expect(source).toMatch(new RegExp(`${field}\\s*:\\s*string`));
    }
  });

  it("contains no university name anywhere in the module", () => {
    // A sample of real UK institutions. None should appear, even in an example.
    for (const name of ["Oxford", "Cambridge", "Manchester", "Coventry", "Leeds", "Birmingham", "Sunderland"]) {
      expect(source).not.toContain(name);
    }
  });
});

describe("Partner institutions: no invented partners, no guessed links", () => {
  it("lists no institutions", () => {
    expect(PARTNER_INSTITUTIONS).toHaveLength(0);
    expect(PARTNER_PROVENANCE.suppliedBy).toBeNull();
  });

  it("contains no URL at all, so none can have been guessed", () => {
    const urls = source.match(/https?:\/\/[^\s"')]+/g) ?? [];
    expect(urls).toEqual([]);
  });

  it("can carry every link staff asked for, each optional so absent stays absent", () => {
    for (const field of [
      "officialWebsite", "agentPortal", "undergraduateCourses",
      "postgraduateCourses", "januaryCourses", "mayCourses",
    ]) {
      expect(source).toMatch(new RegExp(`${field}\\?\\s*:\\s*string`));
    }
  });

  /**
   * The prohibition is structural. There is no field a credential could go
   * in, so the question cannot arise later by somebody adding one "just for
   * now" to a shared screen.
   */
  it("has no field capable of holding a credential", () => {
    for (const forbidden of ["password", "passcode", "mfa", "otp", "recoveryCode", "apiKey", "token", "secret"]) {
      expect(source.toLowerCase()).not.toMatch(new RegExp(`\\b${forbidden}\\??\\s*:\\s*string`));
    }
  });

  it("records the prohibition explicitly, so it is reviewable rather than implied", () => {
    expect(PARTNER_AREA_MUST_NOT_HOLD.length).toBeGreaterThan(0);
    expect(PARTNER_AREA_MUST_NOT_HOLD.join(" ").toLowerCase()).toContain("password");
  });
});

describe("Templates and training: nothing approved, nothing shown", () => {
  it("holds no template text and no training resource", () => {
    expect(MESSAGE_TEMPLATES).toHaveLength(0);
    expect(TRAINING_RESOURCES).toHaveLength(0);
  });

  it("explains why, in terms a staff member can act on", () => {
    expect(TEMPLATES_PROVENANCE.awaiting).toMatch(/approved/i);
  });

  it("records the two undefined items as open rather than guessing at them", () => {
    const open = TEMPLATES_PROVENANCE.openQuestions.join(" ");
    expect(open).toMatch(/phone call/i);
    expect(open).toMatch(/weccpa/i);
  });

  it("invents no WECCPA link", () => {
    expect(source).not.toMatch(/weccpa[^.]{0,40}(https?:|\.com|\.org|podcast\s+link)/i);
  });

  /**
   * A template is text sent to a student under WSA's name. Approved wording
   * has to come from a controlled record, so the field is required and
   * cannot be left blank by a later contributor.
   */
  it("requires every future template to name the record that approved it", () => {
    expect(source).toMatch(/approvedIn\s*:\s*string/);
    expect(source).toMatch(/approvedOn\s*:\s*string/);
  });
});

describe("what was deliberately not done is recorded in code", () => {
  it("lists all six deferred items", () => {
    const deferred = DEFERRED_BY_STAFF_REQUEST.join(" ").toLowerCase();
    for (const item of ["student loan", "mixed funding", "may intake", "partner institution", "phone call", "weccpa"]) {
      expect(deferred).toContain(item);
    }
  });
});
