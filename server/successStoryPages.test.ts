import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import {
  SUCCESS_STORIES,
  SUCCESS_STORY_COUNTRIES,
  SUCCESS_STORY_PATHS,
  publishedCountries,
  successStoryCountryPath,
  type SuccessStory,
  type SuccessStoryCountrySlug,
} from "../shared/successStories";
import { VALID_CLIENT_ROUTES, isValidClientRoute } from "../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../shared/prerenderRoutes";
import { getSeoForPath } from "../shared/seo";

/**
 * Tim Hunt's Student Success Stories page (his design of 11 November 2026):
 * a numbered card per country, each opening that country's stories. What
 * these hold:
 * - only cleared stories reach either page, and a country with none has no
 *   card and no address;
 * - the cards follow Tim's country order and are numbered as shown;
 * - an image recorded as an illustration is labelled on the page;
 * - a story in two languages offers both, each marked as its language;
 * - the route table, prerender list, sitemap and page titles all follow the
 *   gate.
 *
 * The stories here are openly fictional, live only in this file and never
 * enter SUCCESS_STORIES.
 */

const NOW = new Date("2026-11-12T12:00:00Z");
const APP = readFileSync("client/src/App.tsx", "utf8");
const SITEMAP = readFileSync("client/public/sitemap.xml", "utf8");

/** A fictional story, cleared for the website unless told otherwise. */
function fixture(id: string, countrySlug: SuccessStoryCountrySlug, cleared = true): SuccessStory {
  return {
    id,
    identity: { kind: "named", displayName: `Fixture ${id}` },
    countrySlug,
    versions: [
      {
        language: "English",
        lang: "en-GB",
        title: `Title ${id}`,
        byline: [`Fixture ${id}`, "Test Course, Test University"],
        blocks: [
          { kind: "paragraph", text: `Paragraph of story ${id}.` },
          { kind: "image", image: { src: `/fixture-${id}.jpg`, alt: `Photo ${id}`, width: 4, height: 3, caption: `Caption ${id}`, illustration: false } },
          { kind: "signature", lines: [`Fixture ${id}, Testland`] },
        ],
      },
    ],
    evidence: { reference: "Fixture evidence", evidenceDate: "2026-11-01", reviewOwner: "Fixture Reviewer" },
    consent: {
      recorded: cleared,
      scope: ["website"],
      duration: { from: "2026-11-01", until: null },
      finalWordingApproved: true,
      finalVisualApproved: true,
      studentWasChild: false,
      parentOrGuardianConsent: false,
    },
    publication: { status: "approved", publishedLocations: [] },
    outcomeClaimsVerified: true,
    includesSensitiveData: false,
    sensitiveDataAuthority: "",
    claimsRegulatedImmigrationAdvice: false,
    regulatedAdviceAuthority: "",
    humanApprovalToPublish: true,
  };
}

async function render(element: unknown, path = "/student-success-stories"): Promise<string> {
  const React = await import("react");
  const { renderToString } = await import("react-dom/server");
  const { Router } = await import("wouter");
  return renderToString(React.createElement(Router, { ssrPath: path }, element as never));
}

describe("the ten countries, in Tim Hunt's order", () => {
  it("are the ten on his design, each with a flag on the site", () => {
    expect(SUCCESS_STORY_COUNTRIES.map(c => c.name)).toEqual([
      "Angola", "Ghana", "Kenya", "Malawi", "Nigeria", "South Sudan", "Tanzania", "Uganda", "Zambia", "Zimbabwe",
    ]);
    for (const c of SUCCESS_STORY_COUNTRIES) {
      expect(existsSync(`client/public/flags/${c.flagCode}.svg`), c.name).toBe(true);
      expect(successStoryCountryPath(c.slug)).toBe(`/student-success-stories/${c.slug}`);
    }
  });
});

describe("which countries appear", () => {
  const stories = [
    fixture("z", "zimbabwe"),
    fixture("a1", "angola"),
    fixture("k", "kenya", false),
    fixture("a2", "angola"),
  ];

  it("lists only countries with a cleared story, in Tim's order, with their stories in store order", () => {
    const shown = publishedCountries(stories, NOW);
    expect(shown.map(c => c.country.name)).toEqual(["Angola", "Zimbabwe"]);
    expect(shown[0].stories.map(s => s.id)).toEqual(["a1", "a2"]);
    expect(shown[0].path).toBe("/student-success-stories/angola");
  });

  it("drops a country whose only story is not cleared", () => {
    expect(publishedCountries([fixture("k", "kenya", false)], NOW)).toEqual([]);
  });

  it("gives the real store's countries, and only those, an address", () => {
    const real = publishedCountries(SUCCESS_STORIES).map(c => c.path);
    expect([...SUCCESS_STORY_PATHS]).toEqual(real);
    for (const c of SUCCESS_STORY_COUNTRIES) {
      const path = successStoryCountryPath(c.slug);
      expect(isValidClientRoute(path), path).toBe(real.includes(path));
    }
  });
});

describe("the routes, prerender list, sitemap and titles follow the gate", () => {
  it("serves the country pages through one pattern route", () => {
    expect(APP).toContain('<Route path={"/student-success-stories/:country"} component={StudentSuccessStoryCountry} />');
    expect(VALID_CLIENT_ROUTES).toContain("/student-success-stories");
  });

  it("prerenders and lists in the sitemap every country page that exists", () => {
    for (const path of SUCCESS_STORY_PATHS) {
      expect(ALL_PRERENDER_ROUTES, path).toContain(path);
      expect(SITEMAP, path).toContain(`<loc>https://www.worldstudentadvisors.com${path}</loc>`);
    }
  });

  it("lists no hidden country in the sitemap", () => {
    for (const c of SUCCESS_STORY_COUNTRIES) {
      const path = successStoryCountryPath(c.slug);
      if (!SUCCESS_STORY_PATHS.includes(path)) expect(SITEMAP).not.toContain(`${path}<`);
    }
  });

  it("titles each country page with its country", () => {
    expect(getSeoForPath("/student-success-stories/south-sudan").title).toBe(
      "Student Success Stories: South Sudan | World Student Advisors",
    );
  });
});

describe("the page Tim designed", () => {
  it("shows his heading, his line and a numbered card per country, linking to its page", async () => {
    const { StudentSuccessStoriesView } = await import("../client/src/pages/StudentSuccessStories");
    const React = await import("react");
    const countries = publishedCountries([fixture("a1", "angola"), fixture("a2", "angola"), fixture("g", "ghana")], NOW);
    const html = await render(React.createElement(StudentSuccessStoriesView, { countries }));
    expect(html).toContain("Student Success Stories");
    expect(html).toContain("Choose your country to read a student’s story.");
    expect(html).toContain('href="/student-success-stories/angola"');
    expect(html).toContain('href="/student-success-stories/ghana"');
    expect(html).toMatch(/>01<.*>Angola<.*Read 2 stories.*>02<.*>Ghana<.*Read story/s);
    expect(html).toContain('src="/flags/ao.svg"');
    expect(html).toContain("Your Future is Our Mission");
    expect(html).not.toContain("We are still gathering these properly");
  });

  it("says honestly that nothing is published while nothing is cleared", async () => {
    const { StudentSuccessStoriesView } = await import("../client/src/pages/StudentSuccessStories");
    const React = await import("react");
    const html = await render(React.createElement(StudentSuccessStoriesView, { countries: [] }));
    expect(html).toContain("We are still gathering these properly");
    expect(html).not.toContain("Read story");
  });
});

describe("a country's page", () => {
  it("shows each cleared story with its title, byline, text, photograph, caption and closing name", async () => {
    const { StudentSuccessStoryCountryView } = await import("../client/src/pages/StudentSuccessStoryCountry");
    const React = await import("react");
    const [entry] = publishedCountries([fixture("a1", "angola"), fixture("a2", "angola")], NOW);
    const html = await render(React.createElement(StudentSuccessStoryCountryView, { entry }), entry.path);
    for (const id of ["a1", "a2"]) {
      for (const text of [`Title ${id}`, `Fixture ${id}`, `Paragraph of story ${id}.`, `src="/fixture-${id}.jpg"`, `Caption ${id}`, `Fixture ${id}, Testland`]) {
        expect(html, text).toContain(text);
      }
    }
    expect(html).toContain('href="/student-success-stories"');
    expect(html).not.toContain(">Illustration<");
  });

  it("labels an image recorded as an illustration, so it is never passed off as a photograph", async () => {
    const { StudentSuccessStoryCountryView, ILLUSTRATION_LABEL } = await import("../client/src/pages/StudentSuccessStoryCountry");
    const React = await import("react");
    const story = fixture("t", "tanzania");
    const blocks = story.versions[0].blocks.map(b =>
      b.kind === "image" ? { ...b, image: { ...b.image, illustration: true } } : b,
    );
    const illustrated: SuccessStory = { ...story, versions: [{ ...story.versions[0], blocks }] };
    const [entry] = publishedCountries([illustrated], NOW);
    const html = await render(React.createElement(StudentSuccessStoryCountryView, { entry }), entry.path);
    expect(ILLUSTRATION_LABEL).toBe("Illustration");
    expect(html).toContain(`>${ILLUSTRATION_LABEL}<`);
  });

  it("offers a story's second language, each version marked as its language", async () => {
    const { StudentSuccessStoryCountryView } = await import("../client/src/pages/StudentSuccessStoryCountry");
    const React = await import("react");
    const story = fixture("p", "angola");
    const bilingual: SuccessStory = {
      ...story,
      versions: [story.versions[0], { ...story.versions[0], language: "Português", lang: "pt", title: "Título p" }],
    };
    const [entry] = publishedCountries([bilingual], NOW);
    const html = await render(React.createElement(StudentSuccessStoryCountryView, { entry }), entry.path);
    expect(html).toMatch(/<button[^>]*lang="en-GB"[^>]*aria-pressed="true"[^>]*>English</);
    expect(html).toMatch(/<button[^>]*lang="pt"[^>]*aria-pressed="false"[^>]*>Português</);
    expect(html).toContain('lang="en-GB" class="flex flex-col gap-5"');
  });

  it("is Not Found for a country with no cleared story, read only through the gate", () => {
    const src = readFileSync("client/src/pages/StudentSuccessStoryCountry.tsx", "utf8");
    expect(src).toContain("publishedCountries(SUCCESS_STORIES).find(c => c.country.slug === country)");
    expect(src).toContain("if (!entry) return <NotFound />;");
  });
});
