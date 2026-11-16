import { describe, expect, it } from "vitest";
import { createHash } from "crypto";
import { existsSync, readFileSync, statSync } from "fs";
import {
  LIBRARY_CODE_ALIASES,
  LIBRARY_PATH,
  LIBRARY_RESOURCES,
  LIBRARY_RESOURCE_PATHS,
  LIBRARY_SECTIONS,
  REMOVED_RESOURCES,
  getResourceByCode,
  getResourceBySlug,
  resourcePath,
  resourcesInSection,
  searchLibrary,
  WSA_017_PENDING,
} from "../../shared/studentSupportLibrary";
import { VALID_CLIENT_ROUTES, isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { CANONICAL_PATHS, getCanonicalPath, getSeoForPath, shouldNoindex } from "../../shared/seo";
import { getYouTubeVideoId } from "../../client/src/lib/youtube";

/**
 * The Student Support Library rebuilt to Tim Hunt's four-section structure
 * of 26 September 2026, on Tom Arrington's GO of 29 September. What this
 * guards: every intended resource once and only once; the two removed codes
 * absent; WSA 039 in section 1; Tim's corrected recordings for WSA 004 and
 * WSA 017 (the second held on its live recording until his new one is
 * public); a stable permanent page per resource
 * that is a real route, prerendered, in the sitemap and indexable; summary
 * files present; search still finding the right resource; and the pages'
 * source doing what the record says.
 */

/** Tim Hunt's Master Index, 26 September 2026, minus his two removals. */
const TIMS_SECTIONS: Record<string, string[]> = {
  "How WSA Can Help You": ["WSA 001", "WSA 005", "WSA 007", "WSA 034", "WSA 035", "WSA 036", "WSA 037", "WSA 038", "WSA 039"],
  "Choosing Where and What to Study": [
    "WSA 002", "WSA 003", "WSA 004", "WSA 008", "WSA 009", "WSA 012", "WSA 013", "WSA 014",
    "WSA 015", "WSA 016", "WSA 017", "WSA 018", "WSA 019", "WSA 020", "WSA 021", "WSA 022",
  ],
  "Applications, Interviews and Visas": ["WSA 010", "WSA 011", "WSA 023", "WSA 024", "WSA 025", "WSA 026", "WSA 027", "WSA 028", "WSA 029"],
  "Preparing to Travel and Life Abroad": ["WSA 006", "WSA 030", "WSA 031", "WSA 032"],
};
const ALL_INTENDED = Object.values(TIMS_SECTIONS).flat();

const LIBRARY_PAGE = readFileSync("client/src/pages/StudentSupportLibrary.tsx", "utf8");
const RESOURCE_PAGE = readFileSync("client/src/pages/StudentSupportLibraryResource.tsx", "utf8");
const APP = readFileSync("client/src/App.tsx", "utf8");
const SITEMAP = readFileSync("client/public/sitemap.xml", "utf8");
const DATA_SOURCE = readFileSync("shared/studentSupportLibrary.ts", "utf8");

describe("every intended resource, exactly once", () => {
  it("has the 38 resources Tim listed, each code once, and nothing else", () => {
    const codes = LIBRARY_RESOURCES.map(r => r.code);
    expect(codes.length).toBe(38);
    expect(new Set(codes).size).toBe(38);
    expect([...codes].sort()).toEqual([...ALL_INTENDED].sort());
  });

  it("has Tim's four sections, in his order, with his titles", () => {
    expect(LIBRARY_SECTIONS.map(s => s.title)).toEqual(Object.keys(TIMS_SECTIONS));
    expect(LIBRARY_SECTIONS.map(s => s.number)).toEqual([1, 2, 3, 4]);
  });

  it("places every resource in exactly the section Tim gave it, in his order", () => {
    for (const section of LIBRARY_SECTIONS) {
      expect(resourcesInSection(section.id).map(r => r.code), section.title).toEqual(TIMS_SECTIONS[section.title]);
    }
    // The data is in section order, so the page's browse view is Tim's list top to bottom.
    expect(LIBRARY_RESOURCES.map(r => r.code)).toEqual(ALL_INTENDED);
  });

  it("keeps WSA 039 in section 1, as Tim decided twice", () => {
    const ten = getResourceByCode("WSA 039");
    expect(ten?.title).toBe("Ten Steps to UK University Success");
    expect(ten?.section).toBe("how-wsa-can-help-you");
    expect(LIBRARY_SECTIONS.find(s => s.id === ten?.section)?.number).toBe(1);
  });
});

describe("the removed resources are absent", () => {
  it("names WSA 033 and WSA 040 as removed, and neither exists anywhere in the live data", () => {
    expect(REMOVED_RESOURCES.map(r => r.code)).toEqual(["WSA 033", "WSA 040"]);
    for (const { code } of REMOVED_RESOURCES) {
      expect(getResourceByCode(code)).toBeUndefined();
      expect(LIBRARY_RESOURCES.some(r => r.code === code)).toBe(false);
      expect(searchLibrary(code).length).toBe(0);
      expect(SITEMAP).not.toContain(`/${code.toLowerCase().replace(" ", "-")}`);
    }
    expect(getResourceBySlug("uk-university-scholarships")).toBeUndefined();
    expect(getResourceBySlug("student-support-library")).toBeUndefined();
    expect(SITEMAP).not.toContain("uk-university-scholarships");
    expect(isValidClientRoute(`${LIBRARY_PATH}/uk-university-scholarships`)).toBe(false);
    expect(CANONICAL_PATHS[`${LIBRARY_PATH}/wsa-033`]).toBeUndefined();
    expect(CANONICAL_PATHS[`${LIBRARY_PATH}/wsa-040`]).toBeUndefined();
  });

  it("no longer ships the WSA 033 summary, and never shipped a WSA 040 one", () => {
    expect(existsSync("client/public/downloads/wsa-033-summary.pdf")).toBe(false);
    expect(existsSync("client/public/downloads/wsa-040-summary.pdf")).toBe(false);
  });

  it("removed the library-guide recording Tim withdrew from every resource", () => {
    // Td_kgKyDnMQ was the WSA 040 recording, wrongly on WSA 004 until 26 September.
    expect(LIBRARY_RESOURCES.some(r => r.youtubeUrl.includes("Td_kgKyDnMQ"))).toBe(false);
    // MzIk7sdNO9k was WSA 033's.
    expect(LIBRARY_RESOURCES.some(r => r.youtubeUrl.includes("MzIk7sdNO9k"))).toBe(false);
  });
});

describe("Tim's corrections of 26 September 2026", () => {
  it("WSA 004 plays the recording in his list", () => {
    expect(getYouTubeVideoId(getResourceByCode("WSA 004")!.youtubeUrl)).toBe("WqNU_CRy_p8");
  });

  it("WSA 017 keeps its live, playable recording and summary while Tim's new recording is unavailable", () => {
    // YouTube reported mLDmQplce-o "Video unavailable" on 29 September 2026
    // (GitHub Actions run 36617395899); the recording already on the site
    // still plays. The switch waits for Tim; WSA_017_PENDING records it.
    const cwu = getResourceByCode("WSA 017")!;
    expect(getYouTubeVideoId(cwu.youtubeUrl)).toBe("xlJOfunvQYM");
    expect(getYouTubeVideoId(WSA_017_PENDING.youtubeUrl)).toBe("mLDmQplce-o");
    expect(LIBRARY_RESOURCES.some(r => r.youtubeUrl.includes("mLDmQplce-o"))).toBe(false);
    const pdf = readFileSync(`client/public/downloads/${cwu.pdfFile}`);
    expect(pdf.length).toBe(68511);
    expect(createHash("sha256").update(pdf).digest("hex")).toBe("ae30b3ab8f5cf4f6b252ca962818a3b6ff4681a8dc8c3cdfde924f4dd13a6080");
    expect(cwu.keywords).toContain("Cyprus West University");
  });
});

describe("a shared search link", () => {
  it("renders its results server-side from the address bar, not from state copied at mount", async () => {
    // The prerendered page hydrates with an empty search first; the query
    // must therefore be read from the URL on every render. Found live on
    // 29 September 2026 (verifier run 36618602661).
    const React = await import("react");
    const { renderToString } = await import("react-dom/server");
    const { Router } = await import("wouter");
    const { default: Page } = await import("../../client/src/pages/StudentSupportLibrary");
    const html = renderToString(
      React.createElement(Router, { ssrPath: LIBRARY_PATH, ssrSearch: "q=CAS%20Shield" }, React.createElement(Page)),
    );
    expect(html).toContain("WSA 024<");
    expect(html).not.toContain("WSA 001<");
    expect(html).toMatch(/value="CAS Shield"/);
    expect(LIBRARY_PAGE).not.toMatch(/useState\((?:initialQuery|new URLSearchParams)/);
    expect(LIBRARY_PAGE).toMatch(/const query = new URLSearchParams\(search\)\.get\("q"\)/);
  });
});

describe("recordings and summaries", () => {
  it("every recording URL parses to a YouTube id", () => {
    for (const r of LIBRARY_RESOURCES) {
      expect(getYouTubeVideoId(r.youtubeUrl), `${r.code} ${r.youtubeUrl}`).toMatch(/^[A-Za-z0-9_-]{11}$/);
    }
    // No two resources share a recording.
    const ids = LIBRARY_RESOURCES.map(r => getYouTubeVideoId(r.youtubeUrl));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every summary PDF exists and is a PDF", () => {
    for (const r of LIBRARY_RESOURCES) {
      const file = `client/public/downloads/${r.pdfFile}`;
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size, file).toBeGreaterThan(1000);
      expect(readFileSync(file).subarray(0, 5).toString("latin1"), file).toBe("%PDF-");
    }
    expect(new Set(LIBRARY_RESOURCES.map(r => r.pdfFile)).size).toBe(38);
  });

  it("the link checker still reads every live recording from the shared data", () => {
    const parsed = [...DATA_SOURCE.matchAll(
      /code: "(WSA \d{3})",\s*slug: "[^"]+",\s*title: "([^"]+)",\s*description: "[^"]*",\s*youtubeUrl: "([^"]+)"/g,
    )];
    expect(parsed.length).toBe(38);
    expect(readFileSync("scripts/check-library-links.mjs", "utf8")).toContain('const SOURCE = "shared/studentSupportLibrary.ts"');
  });
});

describe("permanent links", () => {
  it("every resource has a stable, unique, lower-case hyphenated slug from the approved table", () => {
    const slugs = LIBRARY_RESOURCES.map(r => r.slug);
    expect(new Set(slugs).size).toBe(38);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(getResourceBySlug("cas-shield")?.code).toBe("WSA 024");
    expect(getResourceBySlug("uk-student-visa-essentials")?.code).toBe("WSA 025");
    expect(getResourceBySlug("ten-steps-to-uk-university-success")?.code).toBe("WSA 039");
    expect(getResourceBySlug("cyprus-west-university")?.code).toBe("WSA 017");
  });

  it("is a real route, prerendered, in the sitemap and indexable, with its own title and canonical", () => {
    expect(LIBRARY_RESOURCE_PATHS.length).toBe(38);
    for (const r of LIBRARY_RESOURCES) {
      const path = resourcePath(r.slug);
      expect(path).toBe(`/student-support-library/${r.slug}`);
      expect(VALID_CLIENT_ROUTES, path).toContain(path);
      expect(isValidClientRoute(path), path).toBe(true);
      expect(ALL_PRERENDER_ROUTES, path).toContain(path);
      expect(SITEMAP, path).toContain(`<loc>https://www.worldstudentadvisors.com${path}</loc>`);
      expect(shouldNoindex(path), path).toBe(false);
      expect(getCanonicalPath(path), path).toBe(path);
      const seo = getSeoForPath(path);
      expect(seo.title, path).toBe(`${r.title} | Student Support Library | World Student Advisors`);
      expect(seo.description, path).toContain(r.code);
    }
    expect(SITEMAP.match(/student-support-library\//g)?.length).toBe(38);
  });

  it("the code form of each link redirects permanently to the slug form", () => {
    expect(Object.keys(LIBRARY_CODE_ALIASES).length).toBe(38);
    expect(CANONICAL_PATHS[`${LIBRARY_PATH}/wsa-024`]).toBe(`${LIBRARY_PATH}/cas-shield`);
    expect(getCanonicalPath(`${LIBRARY_PATH}/wsa-039`)).toBe(`${LIBRARY_PATH}/ten-steps-to-uk-university-success`);
    // The alias is a redirect, not a second page.
    expect(isValidClientRoute(`${LIBRARY_PATH}/wsa-024`)).toBe(false);
    expect(ALL_PRERENDER_ROUTES).not.toContain(`${LIBRARY_PATH}/wsa-024`);
  });

  it("an unknown slug is not a route", () => {
    expect(isValidClientRoute(`${LIBRARY_PATH}/not-a-real-podcast`)).toBe(false);
    expect(getResourceBySlug("not-a-real-podcast")).toBeUndefined();
  });

  it("the app routes the slug pattern to the resource page, which renders NotFound for an unknown slug", () => {
    expect(APP).toContain('<Route path={"/student-support-library/:slug"} component={StudentSupportLibraryResource} />');
    expect(RESOURCE_PAGE).toContain("getResourceBySlug(slug)");
    expect(RESOURCE_PAGE).toContain("if (!resource) return <NotFound />");
  });
});

describe("search", () => {
  it("finds the right resource by a term inside its summary, not only its title", () => {
    expect(searchLibrary("bank statement").map(r => r.resource.code)).toEqual(["WSA 025"]);
    expect(searchLibrary("IHS").map(r => r.resource.code)).toContain("WSA 025");
    expect(searchLibrary("visa costs").map(r => r.resource.code)).toContain("WSA 025");
    expect(searchLibrary("healthcare surcharge").map(r => r.resource.code)).toContain("WSA 025");
    expect(searchLibrary("CAS Shield").map(r => r.resource.code)).toEqual(["WSA 024"]);
    expect(searchLibrary("cyprus west").map(r => r.resource.code)).toEqual(["WSA 017"]);
    expect(searchLibrary("ten steps").map(r => r.resource.code)).toEqual(["WSA 039"]);
  });

  it("returns each resource once, with its one section, in code order, and nothing for nonsense", () => {
    const all = searchLibrary("wsa");
    expect(all.length).toBe(38);
    expect(new Set(all.map(r => r.resource.code)).size).toBe(38);
    for (const r of all) expect(r.section.title).toBe(LIBRARY_SECTIONS.find(s => s.id === r.resource.section)?.title);
    expect(searchLibrary("zzzz-nothing-here")).toEqual([]);
    expect(searchLibrary("   ")).toEqual([]);
  });
});

describe("the pages", () => {
  it("the library page renders the four sections from the data and links every card to its page", () => {
    expect(LIBRARY_PAGE).toContain("LIBRARY_SECTIONS.map(");
    expect(LIBRARY_PAGE).toContain("resourcesInSection(section.id).map(");
    expect(LIBRARY_PAGE).toContain("href={page}");
    expect(LIBRARY_PAGE).toContain("Download Summary");
    expect(LIBRARY_PAGE).toContain("View Summary");
    expect(LIBRARY_PAGE).toContain("Watch / Listen");
    // Search is prominent and shareable.
    expect(LIBRARY_PAGE).toContain('id="library-search"');
    expect(LIBRARY_PAGE).toContain("?q=");
    // The old nine-section shape is gone.
    expect(LIBRARY_PAGE).not.toContain("Appears in:");
    expect(LIBRARY_PAGE).not.toContain("CANONICAL_RESOURCES");
    for (const old of ["Getting Started", "Preparing Your Application", "Your University Application", "Interview Preparation", "CAS, Student Visas and Study Permits", "Arriving and Studying Abroad", "The WSA Student Journey", "Meet WSA"]) {
      expect(LIBRARY_PAGE, old).not.toContain(`"${old}"`);
      expect(DATA_SOURCE, old).not.toContain(`title: "${old}"`);
    }
  });

  it("the resource page gives the recording, summary access and a route back into the library, and captures nothing", () => {
    expect(RESOURCE_PAGE).toContain("getYouTubeEmbedUrl(videoId)");
    expect(RESOURCE_PAGE).toContain("View Summary");
    expect(RESOURCE_PAGE).toContain("Download Summary");
    expect(RESOURCE_PAGE).toContain("Copy link");
    expect(RESOURCE_PAGE).toContain("Back to the Student Support Library");
    expect(RESOURCE_PAGE).toContain("More in {section.number}. {section.title}");
    expect(RESOURCE_PAGE).toContain("LIBRARY_DISCLAIMER");
    expect(RESOURCE_PAGE).not.toMatch(/<form|<input|<textarea|trpc|fetch\(/);
    // Nothing loads from YouTube until play is pressed.
    expect(RESOURCE_PAGE).not.toContain("img.youtube.com");
    expect(RESOURCE_PAGE).not.toContain("ytimg");
  });
});
