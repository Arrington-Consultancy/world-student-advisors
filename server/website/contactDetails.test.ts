import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { REGIONAL_REPRESENTATIVES } from "../../client/src/lib/team";
import { GLADYS_PAGE } from "../../client/src/lib/speakToGladys";

/**
 * Contact details that had drifted apart, corrected on Tom Arrington's
 * instruction of 29 October 2026 ("fix any glaring errors like wrong numbers").
 */
const read = (p: string) => readFileSync(p, "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const contact = read("client/src/pages/Contact.tsx");
const footer = read("client/src/components/Footer.tsx");
const portal = read("client/src/pages/Portal.tsx");

describe("Gladys's WhatsApp is the one Tim gave on 24 October 2026, everywhere", () => {
  it("on /speak-to-gladys, the Contact page and Our Team", () => {
    expect(GLADYS_PAGE.advisor.whatsapp).toBe("+233 55 521 6156");
    const ghana = contact.slice(contact.indexOf('country: "Ghana"'), contact.indexOf('country: "Angola"'));
    expect(ghana).toContain('whatsapp: "+233 55 521 6156"');
    const gladys = REGIONAL_REPRESENTATIVES.find(p => p.name.startsWith("Gladys"))!;
    expect(gladys.whatsapp).toBe("+233 55 521 6156");
    expect(gladys.role).toBe("Director for Ghana");
  });

  it("the old number has gone from the site", () => {
    for (const src of [contact, read("client/src/lib/team.ts")]) {
      expect(src).not.toContain("610 2870");
    }
  });
});

describe("the UK Head Office WhatsApp is +44 7470 689 849, not Tim's personal mobile (15 September 2026)", () => {
  it("in the footer's UK Head Office block", () => {
    const block = footer.slice(footer.indexOf("mailto:UKHeadOffice@"));
    expect(block).toContain("https://wa.me/447470689849");
    expect(block).toContain("WhatsApp: +44 7470 689 849");
    expect(block).not.toContain("7914");
  });

  it("in the Student Portal's United Kingdom (HQ) block", () => {
    const block = portal.slice(portal.indexOf("United Kingdom (HQ)"), portal.indexOf("UKHeadOffice@"));
    expect(block).toContain("WhatsApp: +44 7470 689 849");
    expect(block).not.toMatch(/791 ?479 ?7830/);
  });
});

describe("Tim Hunt's answers of 29 October 2026", () => {
  it("Babatunde's address is spelt babatunde", async () => {
    const { REGIONAL_REPRESENTATIVES } = await import("../../client/src/lib/team");
    const b = REGIONAL_REPRESENTATIVES.find(p => p.name.startsWith("Babatunde"))!;
    expect(b.email).toBe("babatunde@worldstudentadvisors.co.uk");
  });

  it("Sarafina Kihumbu has left: no record, no photograph, not on the fallback staff list", async () => {
    const { REGIONAL_REPRESENTATIVES, WSA_TEAM } = await import("../../client/src/lib/team");
    expect([...WSA_TEAM, ...REGIONAL_REPRESENTATIVES].some(p => p.name.includes("Sarafina"))).toBe(false);
    expect(read("server/_core/env.ts")).not.toContain("sarafina@");
  });
});
