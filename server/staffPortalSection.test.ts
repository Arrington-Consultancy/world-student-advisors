import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sectionFromSearch, SECTION_IDS } from "../client/src/lib/staffSection";

/**
 * Tom Arrington, 12 September 2026, on a phone: Staff access could not be
 * opened at all. The portal's navigation lived in an account menu in a
 * header that scrolled away under the marketing header, which is fixed to
 * the top of the viewport on every route. Two fixes, both asserted here:
 * every section is addressable by URL, and the portal does not render the
 * marketing chrome.
 */
describe("the open section is addressable", () => {
  it("reads a known section from the query string and ignores anything else", () => {
    expect(sectionFromSearch("?section=access")).toBe("access");
    expect(sectionFromSearch("?section=routing")).toBe("routing");
    expect(sectionFromSearch("?foo=1&section=students")).toBe("students");
    expect(sectionFromSearch("")).toBeNull();
    expect(sectionFromSearch("?section=")).toBeNull();
    expect(sectionFromSearch("?section=not-a-section")).toBeNull();
    expect(sectionFromSearch("?section=__proto__")).toBeNull();
    expect(sectionFromSearch("?section=constructor")).toBeNull();
  });

  it("every section the page renders is in the addressable list, so no screen is reachable only through a menu", () => {
    const page = readFileSync(new URL("../client/src/pages/StaffPortal.tsx", import.meta.url), "utf8");
    const rendered = [...page.matchAll(/section === "([a-z]+)"/g)].map(m => m[1]);
    expect(new Set(rendered).size).toBeGreaterThan(5);
    for (const id of new Set(rendered)) expect(SECTION_IDS).toContain(id);
  });

  it("opening and leaving a section both keep the URL in step", () => {
    const page = readFileSync(new URL("../client/src/pages/StaffPortal.tsx", import.meta.url), "utf8");
    expect(page).toContain("sectionFromSearch(window.location.search)");
    expect(page).toContain("writeSectionToUrl(id)");
    expect(page).toContain("writeSectionToUrl(null)");
  });
});

describe("a section that is open, renders", () => {
  it("home shows only when no section is open, so a section outside the card lists is not swallowed", () => {
    // The guard asked whether the open section was one of the cards on the
    // home screen. Staff access, Routing gaps and Resources are reachable
    // only from the account menu and are in no card list, so each set its
    // state and then rendered home: pressing them did nothing.
    const page = readFileSync(new URL("../client/src/pages/StaffPortal.tsx", import.meta.url), "utf8");
    expect(page).toContain("{section === null ? (");
    expect(page).not.toMatch(/current === null && section !== "reception" \?/);
  });

  it("the sections reachable only from the account menu are rendered and are in no card list", () => {
    const page = readFileSync(new URL("../client/src/pages/StaffPortal.tsx", import.meta.url), "utf8");
    const rendered = new Set([...page.matchAll(/section === "([a-z]+)"/g)].map(m => m[1]));
    const cards = new Set([...page.matchAll(/^\s*id: "([a-z]+)",$/gm)].map(m => m[1]));
    for (const id of ["access", "routing", "resources"]) {
      expect(rendered.has(id)).toBe(true);
      expect(cards.has(id)).toBe(false);
    }
  });
});

describe("the portal carries its own chrome", () => {
  it("the marketing header and footer are not rendered on the portal route", () => {
    const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    expect(app).toContain("APP_SHELL_ROUTES");
    expect(app).toContain('"/staff-portal"');
    expect(app).toMatch(/\{!isAppShell && <Header \/>\}/);
    expect(app).toMatch(/\{!isAppShell && <Footer \/>\}/);
  });

  it("the portal's own header is sticky, so its navigation survives scrolling", () => {
    const page = readFileSync(new URL("../client/src/pages/StaffPortal.tsx", import.meta.url), "utf8");
    expect(page).toMatch(/<header className="sticky top-0 z-30/);
  });
});
