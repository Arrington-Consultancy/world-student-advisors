import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import {
  LOGO_ONLY_HEADER_PAGES,
  showsLogoOnlyHeader,
} from "../../client/src/lib/landingPageHeader";
import { VALID_CLIENT_ROUTES, isValidClientRoute } from "../../shared/routes";

/**
 * Tim Hunt, 17 November 2026, "Sign up issue": on a counsellor's or
 * advisor's own landing page the menu's red "Start Your Application"
 * button looks as if it belongs to that person, but it goes to /contact
 * and so to Claudia. Those pages show the logo alone. Claudia's page and
 * the Nigeria postgraduate page keep the full menu, because they embed the
 * same form as /contact.
 */

const HEADER = readFileSync("client/src/components/Header.tsx", "utf8");

function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("which pages show the logo alone", () => {
  it("covers each personal landing page and its thank-you page", () => {
    for (const path of [
      "/speak-to-juliet",
      "/speak-to-juliet/thank-you",
      "/speak-to-madalitso",
      "/speak-to-madalitso/thank-you",
      "/speak-to-gladys",
      "/speak-to-gladys-thank-you",
      "/speak-to-eldah",
      "/speak-to-eldah/thank-you",
      "/speak-to-glenice",
      "/speak-to-glenice/thank-you",
      "/speak-to-manet",
      "/speak-to-manet/thank-you",
      "/speak-to-pedro",
      "/speak-to-pedro/thank-you",
      "/sarkin-fulani-future-leaders",
    ]) {
      expect(isValidClientRoute(path), path).toBe(true);
      expect(showsLogoOnlyHeader(path), path).toBe(true);
    }
  });

  it("ignores a query string, a fragment or a trailing slash", () => {
    expect(showsLogoOnlyHeader("/speak-to-eldah?utm_source=whatsapp")).toBe(
      true
    );
    expect(showsLogoOnlyHeader("/speak-to-glenice#form")).toBe(true);
    expect(showsLogoOnlyHeader("/speak-to-manet/")).toBe(true);
  });

  it("keeps the full menu on Claudia's page, the Nigeria page and the rest of the site", () => {
    for (const path of [
      "/speak-to-claudia",
      "/nigeria-postgraduate",
      "/contact",
      "/contact/thank-you",
      "/",
      "/about",
      "/our-team",
      "/uk-masters-nigeria",
    ]) {
      expect(showsLogoOnlyHeader(path), path).toBe(false);
    }
  });

  it("has decided every personal landing page: a new one must be added here or to Claudia's side", () => {
    const personal = VALID_CLIENT_ROUTES.filter(
      r => r.startsWith("/speak-to-") && !/thank-you/.test(r)
    );
    for (const path of personal) {
      if (path === "/speak-to-claudia") continue;
      expect(LOGO_ONLY_HEADER_PAGES, path).toContain(path);
    }
  });
});

describe("the header", () => {
  const src = stripComments(HEADER);

  it("still shows the logo, linking home, on every page", () => {
    const logo = src.indexOf(
      '<Link href="/" className="relative flex items-center shrink-0">'
    );
    expect(logo).toBeGreaterThan(-1);
    expect(src.lastIndexOf("{!logoOnly && (", logo)).toBe(-1);
  });

  it("drops the desktop menu with its button, the phone menu button and the phone menu", () => {
    expect(src).toContain("const logoOnly = showsLogoOnlyHeader(location);");
    const gates = [...src.matchAll(/\{!logoOnly && \(/g)].map(m => m.index!);
    expect(gates).toHaveLength(2);
    const nav = src.indexOf(
      '<nav className="relative hidden min-[1680px]:flex'
    );
    const button = src.indexOf('aria-label="Toggle menu"');
    expect(gates[0]).toBeLessThan(nav);
    expect(nav).toBeLessThan(gates[1]);
    expect(gates[1]).toBeLessThan(button);
    expect(src).toContain("{mobileOpen && !logoOnly && (");
  });
});
