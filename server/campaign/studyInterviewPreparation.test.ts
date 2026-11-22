import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "fs";
import {
  ABROAD_GROUPS,
  ALL_FORMS,
  ELIGIBILITY,
  HERO,
  NOTE,
  PAGE_PATH,
  PMIQ_DIR,
  STEPS,
  UK_FORMS,
  allRenderedCopy,
  downloadAriaLabel,
  pdfHref,
} from "../../client/src/lib/studyInterviewPreparation";
import {
  LIBRARY_PATH,
  LIBRARY_RESOURCE_PATHS,
} from "../../shared/studentSupportLibrary";
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

  it("holds the video back from the public folders until a person has looked at it", () => {
    expect(SCRIPT).toContain('"pmiq-review/pre-cas-interview.mp4"');
    expect(readFileSync(".gitignore", "utf8")).toMatch(/^pmiq-review\/$/m);
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

  it("uses the mock-up's hero, eligibility card and three steps", () => {
    expect(HERO.heading).toBe("Prepare for your study interview");
    expect(ELIGIBILITY.heading).toBe("Download your questionnaire");
    expect(ELIGIBILITY.text).toContain("have WSA as their sole agent");
    expect(STEPS.map(s => s.title)).toEqual([
      "Download and complete the PDF",
      "Review your preparation",
      "Practise in a mock interview",
    ]);
    expect(STEPS[0].text).toContain(
      "If the PDF will not save on your phone, send your answers in question order."
    );
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
      "Study Interview Preparation | World Student Advisors"
    );
  });

  it("is linked from the library page and links back to it", () => {
    expect(LIBRARY_PAGE).toContain("href={INTERVIEW_PREPARATION_PATH}");
    expect(PAGE).toContain("href={LIBRARY_PATH}");
  });
});
