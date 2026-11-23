import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "fs";
import {
  ABROAD_GROUPS,
  ABROAD_HEADING,
  ABROAD_PODCAST_CODES,
  ALL_FORMS,
  BREADCRUMB,
  ELIGIBILITY_NOTICE,
  HERO,
  NOTE,
  PAGE_PATH,
  PMIQ_DIR,
  QUESTIONNAIRES_ANCHOR,
  STEPS,
  UK_FORMS,
  UK_HEADING,
  UK_PODCAST_CODES,
  allRenderedCopy,
  downloadAriaLabel,
  pdfHref,
} from "../../client/src/lib/studyInterviewPreparation";
import {
  LIBRARY_PATH,
  LIBRARY_RESOURCE_PATHS,
  getResourceByCode,
} from "../../shared/studentSupportLibrary";
import {
  PODCASTS_PAGE,
  allRenderedCopy as podcastsPageCopy,
} from "../../client/src/lib/podcastsPage";
import { isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";
import { getSeoForPath, shouldNoindex } from "../../shared/seo";

/**
 * Study interview preparation: Tim Hunt's page of 18 November 2026 ("Student
 * Library mock interview page") from his mock-up, with one download link
 * per Pre-Mock Interview Questionnaire. What this guards: his nine UK forms
 * and the fifteen PDFs in the NONUK folders, in his numbering; each linked
 * to its own file that exists and is a PDF; the import script and the page
 * naming the same files; no mention of passwords; his note to students;
 * the video kept out of the public folder until a person has looked at it;
 * and the page being a real, indexable, prerendered route inside the
 * library that the library links to.
 */

const PAGE = readFileSync(
  "client/src/pages/StudyInterviewPreparation.tsx",
  "utf8"
);
const LIBRARY_PAGE = readFileSync(
  "client/src/pages/StudentSupportLibrary.tsx",
  "utf8"
);
const APP = readFileSync("client/src/App.tsx", "utf8");
const HEADER = readFileSync("client/src/components/Header.tsx", "utf8");
const SCRIPT = readFileSync("scripts/fetch-pmiq-assets.mjs", "utf8");
const COPY = allRenderedCopy();
const publicPath = (href: string) => `client/public${href}`;

describe("Tim Hunt's questionnaires, 18 November 2026", () => {
  it("lists his nine UK forms, 01 to 09, with the mock-up's titles", () => {
    expect(UK_FORMS.map(f => `${f.number} ${f.title}`)).toEqual([
      "01 Education course interview",
      "02 Social Work course interview",
      "03 Nursing course interview",
      "04 Public Health course interview",
      "05 PhD interview",
      "06 University scholarship interview",
      "07 CAS Shield coaching",
      "08 University credibility interview (non CAS Shield)",
      "09 UKVI credibility interview",
    ]);
  });

  it("groups the forms outside the UK by destination, each in its own block of numbers", () => {
    expect(ABROAD_GROUPS.map(g => `${g.name} ${g.range}`)).toEqual([
      "Australia 20 to 29",
      "Canada 30 to 39",
      "Cyprus West University 40 to 49",
      "Germany 50 to 59",
      "UCLan Cyprus 60 to 69",
      "University of Debrecen 70 to 79",
      "USA 80 to 89",
    ]);
    expect(ABROAD_GROUPS.find(g => g.name === "UCLan Cyprus")?.subtitle).toBe(
      "The British University of Cyprus"
    );
    for (const group of ABROAD_GROUPS) {
      const [low, high] = group.range.split(" to ").map(Number);
      for (const form of group.forms) {
        expect(
          Number(form.number),
          `${group.name} ${form.number}`
        ).toBeGreaterThanOrEqual(low);
        expect(
          Number(form.number),
          `${group.name} ${form.number}`
        ).toBeLessThanOrEqual(high);
      }
    }
  });

  it("links the fifteen PDFs in the NONUK folders, Debrecen's three included", () => {
    expect(ABROAD_GROUPS.flatMap(g => g.forms)).toHaveLength(15);
    expect(
      ABROAD_GROUPS.find(g => g.name === "University of Debrecen")?.forms.map(
        f => f.number
      )
    ).toEqual(["70", "71", "72"]);
  });

  it("gives every form its own number and its own file", () => {
    expect(ALL_FORMS).toHaveLength(24);
    expect(new Set(ALL_FORMS.map(f => f.number)).size).toBe(24);
    expect(new Set(ALL_FORMS.map(f => f.file)).size).toBe(24);
    for (const form of ALL_FORMS) {
      expect(form.file, form.number).toMatch(
        new RegExp(`^pmiq-${form.number}-[a-z0-9-]+\\.pdf$`)
      );
      expect(pdfHref(form)).toBe(`${PMIQ_DIR}/${form.file}`);
    }
  });

  it("links PDFs only: the two Word files in the Debrecen folder are not linked", () => {
    for (const form of ALL_FORMS)
      expect(form.file.endsWith(".pdf"), form.file).toBe(true);
    expect(PAGE).not.toMatch(/\.docx/);
  });

  it("serves every form from this site, and each one is a real PDF", () => {
    for (const form of ALL_FORMS) {
      const file = publicPath(pdfHref(form));
      expect(existsSync(file), file).toBe(true);
      expect(readFileSync(file).subarray(0, 5).toString("latin1"), file).toBe(
        "%PDF-"
      );
    }
  });

  it("serves nothing else from the questionnaire folder: no video, no stray file", () => {
    const served = readdirSync(publicPath(PMIQ_DIR)).sort();
    expect(served).toEqual(ALL_FORMS.map(f => f.file).sort());
  });

  it("names the same files as the import script, from the live folders", () => {
    const imported = [
      ...SCRIPT.matchAll(/"(pmiq-\d{2}-[a-z0-9-]+\.pdf)"/g),
    ].map(m => m[1]);
    expect(imported).toEqual(ALL_FORMS.map(f => f.file));
    const itemIds = [
      ...SCRIPT.matchAll(/\[\s*"(01JQQ47X[A-Z0-9]+)",\s*"pmiq-\d{2}-/g),
    ].map(m => m[1]);
    expect(new Set(itemIds).size).toBe(24);
  });

  it("has no Pre-CAS video: Tim, 23 November 2026, 'This should not be included, Eldah added it'", () => {
    expect(existsSync("client/public/videos/pre-cas-interview.mp4")).toBe(
      false
    );
    expect(SCRIPT).not.toMatch(/\.mp4"/);
    expect(PAGE).not.toMatch(/VideoModal|youtube|Birmingham City/i);
    expect(COPY).not.toMatch(/Pre-CAS/);
  });
});

describe("the page, as Tim asked", () => {
  it("never mentions a password: the forms open without one", () => {
    expect(COPY).not.toMatch(/password/i);
    expect(PAGE).not.toMatch(/password/i);
  });

  it("carries his note: download, fill in, save, send to the counsellor", () => {
    expect(NOTE).toBe(
      "Download the form to your device, fill it in, save it and send the completed copy to your WSA counsellor."
    );
    expect(PAGE).toContain("{NOTE}");
  });

  it("opens with his banner, whose button goes straight to the questionnaires (23 November 2026)", () => {
    expect(HERO.heading).toBe("Practise for your university or visa interview");
    expect(HERO.intro).toBe(
      "Prepare for a course, scholarship or visa interview."
    );
    expect(HERO.cta).toBe("Find your questionnaire");
    expect(existsSync(publicPath(HERO.image))).toBe(true);
    expect(PAGE).toContain("href={`#${QUESTIONNAIRES_ANCHOR}`}");
    expect(PAGE).toContain("id={QUESTIONNAIRES_ANCHOR}");
    expect(PAGE.indexOf("id={QUESTIONNAIRES_ANCHOR}")).toBeLessThan(
      PAGE.indexOf("UK_FORMS.map")
    );
  });

  it("puts How it works directly below the banner, in his three steps", () => {
    expect(STEPS.map(s => s.title)).toEqual([
      "Complete your questionnaire",
      "Review your answers",
      "Practise in a mock interview",
    ]);
    expect(STEPS[0].text).toBe(
      "Download the PDF, fill it in and send it to your WSA counsellor."
    );
    const banner = PAGE.indexOf("{HERO.heading}");
    const steps = PAGE.indexOf("{STEPS_HEADING}");
    expect(steps).toBeGreaterThan(banner);
    expect(PAGE.slice(banner, steps)).not.toMatch(
      /<section[^>]*aria-labelledby="(?!how-it-works)/
    );
  });

  it("shows his eligibility notice above each set of questionnaires", () => {
    expect(ELIGIBILITY_NOTICE).toBe(
      "Free mock interview preparation is available only to WSA students we have supported from first contact through their application and offer at a WSA partner institution."
    );
    const notices = [...PAGE.matchAll(/<EligibilityNotice \/>/g)].map(
      m => m.index!
    );
    expect(notices).toHaveLength(2);
    expect(notices[0]).toBeGreaterThan(PAGE.indexOf("{UK_HEADING}"));
    expect(notices[0]).toBeLessThan(PAGE.indexOf("UK_FORMS.map"));
    expect(notices[1]).toBeGreaterThan(PAGE.indexOf("{ABROAD_HEADING}"));
    expect(notices[1]).toBeLessThan(PAGE.indexOf("ABROAD_GROUPS.map"));
    expect(UK_HEADING).toBe("UK Pre-Mock Interview Questionnaires (PMIQ)");
    expect(ABROAD_HEADING).toBe(
      "Pre-Mock Interview Questionnaires (PMIQ) outside the UK"
    );
  });

  it("lists WSA 023 to 026 under the UK forms and 017, 020 and 021 under the rest, as in his document", () => {
    expect(UK_PODCAST_CODES).toEqual([
      "WSA 023",
      "WSA 024",
      "WSA 025",
      "WSA 026",
    ]);
    expect(ABROAD_PODCAST_CODES).toEqual(["WSA 017", "WSA 020", "WSA 021"]);
    // The episode links in "PMIQ feedback 23 Nov 2026.docx".
    const links: Record<string, string> = {
      "WSA 023": "cas-and-ukvi-credibility-interview",
      "WSA 024": "cas-shield",
      "WSA 025": "uk-student-visa-essentials",
      "WSA 026": "uk-university-credibility-interview",
      "WSA 021": "university-of-debrecen",
      "WSA 017": "cyprus-west-university",
      "WSA 020": "uclan-cyprus-the-british-university",
    };
    for (const [code, slug] of Object.entries(links))
      expect(getResourceByCode(code)?.slug, code).toBe(slug);
    const uk = PAGE.indexOf("codes={UK_PODCAST_CODES}");
    const abroad = PAGE.indexOf("codes={ABROAD_PODCAST_CODES}");
    expect(uk).toBeGreaterThan(PAGE.indexOf("UK_FORMS.map"));
    expect(uk).toBeLessThan(PAGE.indexOf("{ABROAD_HEADING}"));
    expect(abroad).toBeGreaterThan(PAGE.indexOf("ABROAD_GROUPS.map"));
    expect(PAGE).toContain("href={resourcePath(r.slug)}");
  });

  it("downloads each form to the device, with a label a screen reader can tell apart", () => {
    const button = PAGE.split("function DownloadButton(")[1].split(
      "\nexport default"
    )[0];
    expect(button).toContain("href={pdfHref(form)}");
    expect(button).toMatch(/\n\s+download\n/);
    expect(button).toContain("whitespace-nowrap");
    const labels = ALL_FORMS.map(f => {
      const group = ABROAD_GROUPS.find(g => g.forms.includes(f));
      return downloadAriaLabel(f, group);
    });
    expect(new Set(labels).size).toBe(24);
    expect(labels).toContain(
      "Download PDF: 21, Australia, University and Course Credibility Interview"
    );
  });

  it("passes the copy checks: no em dashes", () => {
    expect(COPY).not.toContain("—");
  });
});

describe("Podcasts & Mock Interviews, Tim Hunt's brief of 23 November 2026", () => {
  it("renames the menu item, with Podcasts and Mock Interviews underneath, at the same addresses", () => {
    expect(HEADER).not.toContain('label: "Student Support Library"');
    expect(HEADER).toContain('label: "Podcasts & Mock Interviews"');
    expect(HEADER).toContain(`{ label: "Podcasts", href: "${LIBRARY_PATH}" }`);
    expect(HEADER).toContain(
      `{ label: "Mock Interviews", href: "${PAGE_PATH}" }`
    );
    expect(LIBRARY_PATH).toBe("/student-support-library");
    expect(BREADCRUMB).toEqual({
      section: "Podcasts & Mock Interviews",
      page: "Mock Interviews",
    });
  });

  it("opens the Podcasts page with his design: hero, a working search box and four topic cards", () => {
    expect(PODCASTS_PAGE.heading).toBe("WSA Podcasts");
    expect(PODCASTS_PAGE.sub).toBe(
      "Listen or read the episode summaries. No sign-up needed."
    );
    expect(PODCASTS_PAGE.searchPlaceholder).toBe(
      "Try CAS Shield, scholarships or Canada"
    );
    expect(existsSync(publicPath(PODCASTS_PAGE.image))).toBe(true);
    expect(PODCASTS_PAGE.topics.map(t => [t.section, t.label])).toEqual([
      [1, "How WSA can help"],
      [2, "Choosing where and what to study"],
      [3, "Applications, interviews and visas"],
      [4, "Travel and life abroad"],
    ]);
    // Each card jumps to its section; the search box is the one that works.
    expect(LIBRARY_PAGE).toContain("href={`#section-${topic.section}`}");
    expect(LIBRARY_PAGE).toContain('id="library-search"');
    expect(LIBRARY_PAGE).toContain("onChange={e => setQuery(e.target.value)}");
  });

  it("links the Podcasts page clearly to Mock Interviews, near the top", () => {
    const link = LIBRARY_PAGE.indexOf("{PODCASTS_PAGE.mockInterviews.link}");
    expect(link).toBeGreaterThan(0);
    expect(link).toBeLessThan(
      LIBRARY_PAGE.indexOf("LIBRARY_SECTIONS.map((section, sectionIndex)")
    );
    expect(podcastsPageCopy()).not.toContain("—");
  });
});

describe("a real page inside the Student Support Library", () => {
  it("lives under the library, and no library resource can take its slug", () => {
    expect(PAGE_PATH.startsWith(`${LIBRARY_PATH}/`)).toBe(true);
    expect(LIBRARY_RESOURCE_PATHS).not.toContain(PAGE_PATH);
    expect(isValidClientRoute(PAGE_PATH)).toBe(true);
  });

  it("is routed ahead of the library resource pattern, which would otherwise catch it", () => {
    const own = APP.indexOf(
      `<Route path={"${PAGE_PATH}"} component={StudyInterviewPreparation} />`
    );
    const pattern = APP.indexOf(
      '<Route path={"/student-support-library/:slug"}'
    );
    expect(own).toBeGreaterThan(0);
    expect(own).toBeLessThan(pattern);
  });

  it("is indexable, prerendered, in the sitemap and has its own title", () => {
    expect(shouldNoindex(PAGE_PATH)).toBe(false);
    expect(ALL_PRERENDER_ROUTES).toContain(PAGE_PATH);
    expect(readFileSync("client/public/sitemap.xml", "utf8")).toContain(
      `<loc>https://www.worldstudentadvisors.com${PAGE_PATH}</loc>`
    );
    expect(getSeoForPath(PAGE_PATH).title).toBe(
      "Mock Interviews | World Student Advisors"
    );
    expect(getSeoForPath(LIBRARY_PATH).title).toBe(
      "WSA Podcasts | World Student Advisors"
    );
  });

  it("is linked from the library page and links back to it", () => {
    expect(LIBRARY_PAGE).toContain("href={INTERVIEW_PREPARATION_PATH}");
    expect(PAGE).toContain("href={LIBRARY_PATH}");
  });
});
