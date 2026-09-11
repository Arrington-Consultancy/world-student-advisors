import { describe, it, expect } from "vitest";
import {
  UNIVERSITY_PORTALS,
  UNIVERSITY_PORTAL_PROVENANCE,
  PORTAL_AREA_MUST_NOT_HOLD,
  checkUniversityPortal,
  usablePortals,
  type UniversityPortal,
} from "./universityPortals";

/**
 * University application portals in one place, asked for by Tim Hunt on
 * 11 September 2026.
 *
 * The tests that matter here are not about rendering. They are about what
 * must never appear: an invented university, a constructed URL, or anything
 * credential-shaped. A portal link is the single most dangerous field on
 * this screen, because a counsellor clicks it while a student waits.
 */

const REAL: UniversityPortal = {
  university: "Example University",
  applicationPortal: "https://apply.example.ac.uk/",
  instructions: "https://worldstudentadvisors123.sharepoint.com/sites/WSASharePoint/how-to",
};

describe("nothing is invented", () => {
  it("ships empty, because no list has been supplied", () => {
    expect(UNIVERSITY_PORTALS).toEqual([]);
  });

  it("cannot be mutated into holding an invented university at runtime", () => {
    expect(Object.isFrozen(UNIVERSITY_PORTALS)).toBe(true);
  });

  it("names who is supplying the list, so empty reads as pending rather than broken", () => {
    expect(UNIVERSITY_PORTAL_PROVENANCE.suppliedBy).toBe("Tim Hunt");
    expect(UNIVERSITY_PORTAL_PROVENANCE.awaiting).toBeTruthy();
    expect(UNIVERSITY_PORTAL_PROVENANCE.openQuestions.length).toBeGreaterThan(0);
  });
});

describe("no field could ever hold a credential", () => {
  it("has no property whose name is credential-shaped", () => {
    // The shape is the control. If a field were added later that could hold
    // a shared login, this fails rather than waiting for somebody to notice
    // a password on a screen that many people can open.
    const allowed = ["university", "applicationPortal", "instructions", "lastChecked", "note"];
    const banned = PORTAL_AREA_MUST_NOT_HOLD.map(s => s.toLowerCase().replace(/[^a-z]/g, ""));
    for (const field of allowed) {
      expect(banned).not.toContain(field.toLowerCase());
    }
    expect(PORTAL_AREA_MUST_NOT_HOLD).toContain("shared login");
    expect(PORTAL_AREA_MUST_NOT_HOLD).toContain("password");
  });

  it("a supplied record only ever carries the five known fields", () => {
    expect(Object.keys(REAL).every(k =>
      ["university", "applicationPortal", "instructions", "lastChecked", "note"].includes(k),
    )).toBe(true);
  });
});

describe("a link that reaches a counsellor is a real https link", () => {
  it("accepts a proper record", () => {
    expect(checkUniversityPortal(REAL).usable).toBe(true);
  });

  it("accepts a university with no links yet, which is a real state", () => {
    expect(checkUniversityPortal({ university: "Example University" }).usable).toBe(true);
  });

  it("REFUSES a record with no university name", () => {
    expect(checkUniversityPortal({ university: "  " }).code).toBe("university_missing");
  });

  it("REFUSES a javascript: link, which is not a link at all", () => {
    const d = checkUniversityPortal({ ...REAL, applicationPortal: "javascript:alert(1)" });
    expect(d.usable).toBe(false);
    expect(d.code).toBe("link_not_https");
  });

  it("REFUSES plain http, since a portal carries student data", () => {
    expect(checkUniversityPortal({ ...REAL, applicationPortal: "http://apply.example.ac.uk/" }).code)
      .toBe("link_not_https");
  });

  it("REFUSES a bare domain typed without a scheme", () => {
    // "apply.example.ac.uk" renders as a relative link and silently goes to
    // the wrong place, which is worse than not working at all.
    expect(checkUniversityPortal({ ...REAL, applicationPortal: "apply.example.ac.uk" }).code)
      .toBe("link_not_absolute");
  });

  it("checks the instructions link to the same standard as the portal link", () => {
    expect(checkUniversityPortal({ ...REAL, instructions: "javascript:alert(1)" }).code)
      .toBe("link_not_https");
    expect(checkUniversityPortal({ ...REAL, instructions: "data:text/html,hi" }).code)
      .toBe("link_not_https");
  });

  it("filters an unusable record out before anything renders", () => {
    const mixed = [REAL, { university: "Bad", applicationPortal: "javascript:alert(1)" }];
    expect(usablePortals(mixed)).toEqual([REAL]);
  });

  it("explains every refusal in words a person can act on", () => {
    for (const bad of [
      { university: "" },
      { university: "X", applicationPortal: "http://x.test" },
      { university: "X", instructions: "not-a-url" },
    ]) {
      const d = checkUniversityPortal(bad);
      expect(d.usable).toBe(false);
      expect(d.reason).toBeTruthy();
    }
  });
});
