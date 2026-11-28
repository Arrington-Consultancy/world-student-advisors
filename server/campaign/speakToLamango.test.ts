import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import {
  CAMEROON_FLAG_SRC,
  COPY,
  DEFAULT_LANG,
  LAMANGO,
  LAMANGO_FORM_URL,
  LANGS,
  MANET_PHOTO,
  MAP,
  PAGE_PATH,
  PORTRAIT,
  SUCCESS_STORIES_PATH,
  THANK_YOU_PATH,
  allRenderedCopy,
} from "../../client/src/lib/speakToLamango";
import { showsLogoOnlyHeader } from "../../client/src/lib/landingPageHeader";
import { isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { getSeoForPath, shouldNoindex } from "../../shared/seo";

/**
 * World Student Advisors Cameroon, Lamango's page, rebuilt on 28 November
 * 2026 to Tim Hunt's mock-up of that day. What these hold: the form is his,
 * exactly; the wording, map and photographs are the ones in his mock-up;
 * English is on the left and French on the right as he drew them, and a
 * phone opens in French; her details match the Contact page; she has her
 * own thank-you page; and the page stays out of search until Tim approves.
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

  it("lays the languages out as his mock-up does, and opens in French on a phone", () => {
    expect(LANGS).toEqual(["en", "fr"]);
    expect(DEFAULT_LANG).toBe("fr");
    expect(PAGE).toContain("useState<Lang>(DEFAULT_LANG)");
    expect(COPY.fr.htmlLang).toBe("fr-CM");
    expect(COPY.en.htmlLang).toBe("en-GB");
    expect(PAGE).toContain("aria-pressed={lang === l}");
  });

  it("uses his wording about Lamango and Manet, in both languages", () => {
    expect(COPY.en.intro.paragraphs[0]).toBe(
      "Based in Yaoundé, Lamango Enow Magdaline is World Student Advisors’ regional representative for Central Africa. She speaks French and English and will be your first point of contact to discuss studying abroad. She’ll help you choose a destination and course that suit your goals and budget."
    );
    expect(COPY.fr.intro.paragraphs[1]).toBe(
      "Lorsque vous serez prêt à déposer votre candidature, Lamango vous mettra en contact avec Manet Khamayo, votre conseillère WSA. Manet suivra votre candidature auprès de l’établissement et vous aidera à préparer votre demande de visa étudiant. Nos conseils et notre accompagnement pour les candidatures universitaires sont gratuits."
    );
    expect(COPY.en.intro.whatsapp).toBe("WhatsApp Lamango");
    expect(COPY.fr.intro.whatsapp).toBe("Écrire à Lamango sur WhatsApp");
    expect(COPY.en.manet.heading).toBe("Meet Manet Khamayo");
    expect(COPY.fr.manet.heading).toBe("Rencontrez Manet Khamayo");
    expect(COPY.fr.stories.heading).toBe("Parcours de réussite avec WSA");
  });

  it("lists his nine Central African countries in each language", () => {
    expect(COPY.en.region.countries).toHaveLength(9);
    expect(COPY.fr.region.countries).toHaveLength(9);
    expect(COPY.en.region.countries).toContain("Cameroon");
    expect(COPY.fr.region.countries).toContain("Tchad");
  });

  it("shows his map, her portrait and Manet's photograph, and links the success stories", () => {
    for (const image of [MAP, PORTRAIT, MANET_PHOTO]) {
      expect(existsSync(`client/public${image.src}`), image.src).toBe(true);
    }
    expect(PAGE).toContain("src={MAP.src}");
    expect(PAGE).toContain("src={PORTRAIT.src}");
    expect(PAGE).toContain("src={MANET_PHOTO.src}");
    expect(isValidClientRoute(SUCCESS_STORIES_PATH)).toBe(true);
    expect(PAGE).toContain("href={SUCCESS_STORIES_PATH}");
  });

  it("has the same sections in both languages, with no em dash or guarantee language (server/siteCopy.test.ts checks the rest)", () => {
    expect(COPY.fr.help.items).toHaveLength(COPY.en.help.items.length);
    expect(COPY.fr.destinations.list).toHaveLength(
      COPY.en.destinations.list.length
    );
    const copy = allRenderedCopy();
    expect(copy).not.toContain("\u2014");
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

  it("are shown under her portrait, as his mock-up asks, and on her thank-you page, with the Cameroon flag on her page", () => {
    expect(PAGE).toContain("href={LAMANGO.phoneHref}");
    expect(PAGE).toContain("href={LAMANGO.whatsappHref}");
    expect(PAGE).toContain("mailto:${LAMANGO.email}");
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
  it("is routed with the logo-only header, and kept out of search until Tim approves it", () => {
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
