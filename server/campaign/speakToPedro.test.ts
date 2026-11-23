import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import {
  COPY,
  ELDAH,
  PAGE_PATH,
  PEDRO,
  PEDRO_FORM_URL,
  PODCAST,
  STORIES_PATHS,
  allRenderedCopy,
} from "../../client/src/lib/speakToPedro";
import { LOGO_ONLY_HEADER_PAGES } from "../../client/src/lib/landingPageHeader";
import { LIBRARY_RESOURCES } from "../../shared/studentSupportLibrary";
import { SUCCESS_STORY_PATHS } from "../../shared/successStories";
import { isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { getSeoForPath, shouldNoindex } from "../../shared/seo";
import { getYouTubeVideoId } from "../../client/src/lib/youtube";

/**
 * Speak to Pedro / Fale com o Pedro: Tim Hunt's bilingual page of
 * 22 November 2026 ("Pedro landing pages"). What this guards: his words in
 * both languages, side by side with each column marked with its language;
 * Pedro's own Pipedrive form exactly as supplied; Eldah Therone as the
 * counsellor he introduces; WSA 039 from the library; the Angola stories;
 * the contact details the site already publishes for Pedro; and a real,
 * indexable page with the logo-only header.
 */

const PAGE = readFileSync("client/src/pages/SpeakToPedro.tsx", "utf8");
const TEAM = readFileSync("client/src/lib/team.ts", "utf8");
const CONTACT = readFileSync("client/src/pages/Contact.tsx", "utf8");
const publicFile = (src: string) => existsSync(`client/public${src}`);

describe("Tim Hunt's mock-up, in English and Portuguese", () => {
  it("names Pedro and his role in both languages", () => {
    expect(COPY.en.hero.headline).toBe("Speak to Pedro");
    expect(COPY.pt.hero.headline).toBe("Fale com o Pedro");
    expect(COPY.en.hero.role).toBe(
      "Director for Portuguese-speaking Countries"
    );
    expect(COPY.pt.hero.role).toBe("Director para os Países Lusófonos");
    expect(COPY.en.hero.intro[0]).toBe(
      "I’m Pedro Bezerra. I was born in Angola, am a British citizen and live in the UK. I speak English and Portuguese fluently."
    );
    expect(COPY.pt.hero.intro[1]).toContain("Universidade de Coventry");
  });

  it("has the same sections in both languages", () => {
    expect(COPY.en.help.items).toHaveLength(3);
    expect(COPY.pt.help.items).toHaveLength(3);
    expect(COPY.en.destinations.list).toHaveLength(
      COPY.pt.destinations.list.length
    );
    expect(COPY.en.destinations.list).toEqual([
      "UK",
      "USA",
      "Canada",
      "Australia",
      "Germany",
      "Cyprus",
      "Hungary",
      "Ireland",
      "Europe",
    ]);
  });

  it("marks each column with its language, so a screen reader reads it properly", () => {
    expect(COPY.en.htmlLang).toBe("en-GB");
    expect(COPY.pt.htmlLang).toBe("pt-AO");
    expect(PAGE).toContain("lang={COPY[l].htmlLang}");
    expect(PAGE).toContain("lang={COPY.en.htmlLang}");
    expect(PAGE).toContain("lang={COPY.pt.htmlLang}");
  });

  it("keeps both languages in the page and lets the phone switch choose one", () => {
    expect(PAGE).toContain("aria-pressed={lang === l}");
    expect(PAGE).toContain('"hidden lg:block"');
    expect(COPY.en.switchLabel).toBe("English");
    expect(COPY.pt.switchLabel).toBe("Português");
  });

  it("carries the corrected Portuguese in the Eldah box, for Pedro to check", () => {
    expect(COPY.pt.eldah.body).toBe(
      "Quando estiver pronto para se candidatar, o Pedro vai apresentá-lo à Eldah. Ela vai ajudá-lo a preparar os documentos e a apresentar a candidatura à universidade."
    );
    expect(allRenderedCopy()).not.toContain("apresentá-la-á");
  });
});

describe("what the page links to", () => {
  it("embeds Pedro's own bilingual Pipedrive form, once, exactly as supplied", () => {
    expect(PEDRO_FORM_URL).toBe(
      "https://webforms.pipedrive.com/f/ccRoBZeUNXEdCX5jkah4pkwpWOJPWPKi15KSGg9ztZODgnu2uyiKRVutGmpOXy8zmj"
    );
    expect(PAGE.match(/<PipedriveFormEmbed /g)).toHaveLength(1);
    expect(PAGE).toContain("embedUrl={PEDRO_FORM_URL}");
    expect(PAGE).not.toContain("<form");
  });

  it("plays WSA 039 from the Student Support Library", () => {
    const wsa039 = LIBRARY_RESOURCES.find(r => r.code === "WSA 039")!;
    expect(getYouTubeVideoId(wsa039.youtubeUrl)).toBe(PODCAST.youtubeId);
    expect(PODCAST.libraryPath).toBe(`/student-support-library/${wsa039.slug}`);
    expect(COPY.en.podcast.title).toContain(wsa039.title);
  });

  it("links to the Angola stories, which are published, and to all stories", () => {
    expect(SUCCESS_STORY_PATHS).toContain(STORIES_PATHS.angola);
    expect(isValidClientRoute(STORIES_PATHS.all)).toBe(true);
  });

  it("introduces Eldah Therone, with her Our Team photograph", () => {
    expect(COPY.en.eldah.heading).toBe("Meet Eldah Therone");
    expect(publicFile(ELDAH.photo)).toBe(true);
  });

  it("uses Pedro's photograph from Tim, and the contact details the site already publishes for him", () => {
    expect(publicFile(PEDRO.photo)).toBe(true);
    expect(CONTACT).toContain(`phone: "${PEDRO.phone}"`);
    expect(CONTACT).toContain(`email: "${PEDRO.email}"`);
    expect(TEAM).toContain('name: "Pedro Bezerra"');
    expect(PEDRO.phoneHref).toBe(`tel:${PEDRO.phone.replace(/ /g, "")}`);
  });
});

describe("a real page", () => {
  it("is routed, indexable, prerendered and in the sitemap, with a bilingual title", () => {
    expect(isValidClientRoute(PAGE_PATH)).toBe(true);
    expect(shouldNoindex(PAGE_PATH)).toBe(false);
    expect(ALL_PRERENDER_ROUTES).toContain(PAGE_PATH);
    expect(readFileSync("client/public/sitemap.xml", "utf8")).toContain(
      `<loc>https://www.worldstudentadvisors.com${PAGE_PATH}</loc>`
    );
    expect(getSeoForPath(PAGE_PATH).title).toContain("Fale com o Pedro");
  });

  it("shows the logo-only header, as the mock-up does", () => {
    expect(LOGO_ONLY_HEADER_PAGES).toContain(PAGE_PATH);
  });
});
