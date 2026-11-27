import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import {
  CAMEROON_FLAG_SRC,
  COPY,
  LAMANGO,
  LAMANGO_FORM_URL,
  LANGS,
  PAGE_PATH,
  THANK_YOU_PATH,
  allRenderedCopy,
} from "../../client/src/lib/speakToLamango";
import { showsLogoOnlyHeader } from "../../client/src/lib/landingPageHeader";
import { isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { getSeoForPath, shouldNoindex } from "../../shared/seo";

/**
 * Parlez à Lamango / Speak to Lamango, a first draft built on 27 November
 * 2026 from Tim Hunt's bilingual Pipedrive form and the details the Contact
 * page already publishes. What these hold: the form is his, exactly; French
 * comes first; her details match the Contact page; she has her own thank-you
 * page; and the page stays a draft, out of search, until Tim supplies her
 * content.
 */

const PAGE = readFileSync("client/src/pages/SpeakToLamango.tsx", "utf8");
const THANK_YOU = readFileSync(
  "client/src/pages/SpeakToLamangoThankYou.tsx",
  "utf8"
);
const CONTACT_BAND = readFileSync(
  "client/src/components/LamangoContact.tsx",
  "utf8"
);
const CONTACT = readFileSync("client/src/pages/Contact.tsx", "utf8");
const APP = readFileSync("client/src/App.tsx", "utf8");
const SITEMAP = readFileSync("client/public/sitemap.xml", "utf8");

describe("Tim Hunt's form, in French and English", () => {
  it("embeds his form once, exactly as supplied", () => {
    expect(LAMANGO_FORM_URL).toBe(
      "https://webforms.pipedrive.com/f/6zhaUeZkY2Bc4jY7Rwdes9m6f6wJbIUyRR06KZRFG5WGRI7uuNYQsoqyCaJfahar5h"
    );
    expect(PAGE.match(/<PipedriveFormEmbed/g)).toHaveLength(1);
    expect(PAGE).toContain("embedUrl={LAMANGO_FORM_URL}");
  });

  it("puts French first, as his form does, and opens in French on a phone", () => {
    expect(LANGS).toEqual(["fr", "en"]);
    expect(PAGE).toContain('useState<Lang>("fr")');
    expect(COPY.fr.htmlLang).toBe("fr-CM");
    expect(COPY.en.htmlLang).toBe("en-GB");
    expect(PAGE).toContain("lang={COPY[l].htmlLang}");
    expect(PAGE).toContain("aria-pressed={lang === l}");
  });

  it("describes Lamango in the form's own words, in both languages", () => {
    expect(COPY.fr.hero.intro.join(" ")).toBe(
      "Lamango dirige le bureau de World Student Advisors à Yaoundé, au Cameroun, et accompagne les étudiants des pays francophones d’Afrique centrale. Elle vous contactera en français ou en anglais, selon votre préférence, pour discuter de vos options d’études."
    );
    expect(COPY.en.hero.intro.join(" ")).toBe(
      "Lamango runs the World Student Advisors office in Yaoundé, Cameroon, and supports students from francophone countries across Central Africa. She’ll contact you in French or English, whichever you prefer, to discuss your study options."
    );
    expect(COPY.fr.form.supporting).toBe(
      "Dites-nous ce que vous aimeriez étudier."
    );
  });

  it("has the same sections in both languages, with no em dash or guarantee language (server/siteCopy.test.ts checks the rest)", () => {
    expect(COPY.fr.help.items).toHaveLength(COPY.en.help.items.length);
    expect(COPY.fr.destinations.list).toHaveLength(
      COPY.en.destinations.list.length
    );
    const copy = allRenderedCopy();
    expect(copy).not.toContain("—");
    expect(copy).not.toMatch(/guarantee|garanti/i);
  });
});

describe("her details", () => {
  it("are the ones the Contact page already publishes", () => {
    expect(CONTACT).toContain(`name: "${LAMANGO.name}"`);
    expect(CONTACT).toContain(`phone: "${LAMANGO.phone}"`);
    expect(CONTACT).toContain(`email: "${LAMANGO.email}"`);
    expect(CONTACT).toContain(`address: "${LAMANGO.address}"`);
    expect(LAMANGO.phoneHref).toBe(`tel:${LAMANGO.phone.replace(/ /g, "")}`);
    expect(LAMANGO.whatsappHref).toBe(
      `https://wa.me/${LAMANGO.phone.replace(/\D/g, "")}`
    );
  });

  it("are shown on her page and on her thank-you page, with the Cameroon flag on her page", () => {
    expect(PAGE).toContain("<LamangoContact />");
    expect(THANK_YOU).toContain("<LamangoContact />");
    expect(CONTACT_BAND).toContain("href={LAMANGO.phoneHref}");
    expect(CONTACT_BAND).toContain("href={LAMANGO.whatsappHref}");
    expect(CONTACT_BAND).toContain("mailto:${LAMANGO.email}");
    expect(CAMEROON_FLAG_SRC).toBe("/flags/cm.svg");
    expect(existsSync(`client/public${CAMEROON_FLAG_SRC}`)).toBe(true);
    expect(PAGE).toContain("src={CAMEROON_FLAG_SRC}");
  });
});

describe("a draft with its own thank-you page", () => {
  it("is routed with the logo-only header, and kept out of search until Tim supplies her content", () => {
    for (const path of [PAGE_PATH, THANK_YOU_PATH]) {
      expect(isValidClientRoute(path), path).toBe(true);
      expect(APP, path).toContain(`<Route path={"${path}"}`);
      expect(shouldNoindex(path), path).toBe(true);
      expect(ALL_PRERENDER_ROUTES, path).not.toContain(path);
      expect(SITEMAP, path).not.toContain(path);
      expect(showsLogoOnlyHeader(path), path).toBe(true);
      expect(getSeoForPath(path).title, path).toContain("Lamango");
    }
  });

  it("thanks the student in both languages, names Lamango and nobody else, and captures nothing", () => {
    expect(COPY.fr.thankYou.headline).toContain("Lamango");
    expect(COPY.en.thankYou.headline).toBe(
      "Thank you. Your details are with Lamango."
    );
    const code = THANK_YOU.replace(/\/\*[\s\S]*?\*\//g, " ");
    expect(code).not.toMatch(/<form|<input|trpc\.|fetch\(/);
    expect(code).not.toMatch(/eldah|pedro/i);
    expect(code).toContain("href={PAGE_PATH}");
  });
});
