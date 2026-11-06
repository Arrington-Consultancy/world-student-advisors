import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { MADALITSO_PAGE } from "../../client/src/lib/speakToMadalitso";
import { GLADYS_PAGE } from "../../client/src/lib/speakToGladys";
import { MADALITSO_READ_FIRST as N } from "../../client/src/lib/madalitsoReadFirst";

/**
 * "Please read this before contacting Madalitso", Tim Hunt's notice of
 * 5 November 2026 in English and Chichewa (POPUP.docx). What these hold:
 * the notice is on Madalitso's page and no other, in both languages with
 * the same nine points; every kwacha amount is the pound amount at Tim's
 * rate of £1 ≈ MK2,325, and the sums add up; the page offers it above the
 * first WhatsApp button, in the closing section and above the form; and
 * nothing opens it but the visitor (Tom Arrington, 6 November 2026).
 */

const PAGE = readFileSync("client/src/pages/AdvisorLandingPage.tsx", "utf8");
const COMPONENT = readFileSync("client/src/components/ReadFirstNotice.tsx", "utf8");

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const [EN, NY] = N.versions;
const RATE = 2325;

const pounds = (s: string) => [...s.matchAll(/£([\d,]+)/g)].map(m => Number(m[1].replace(/,/g, "")));
const kwachaMillions = (s: string) => [...s.matchAll(/MK([\d.]+) (?:million|miliyoni)/g)].map(m => Number(m[1]));
const allLines = (v: typeof EN) => v.points.flatMap(p => [p.body, ...(p.costs ?? [])]);

describe("where the notice appears", () => {
  it("is on Madalitso's page, and not on Gladys's", () => {
    expect(MADALITSO_PAGE.readFirst).toBe(N);
    expect(GLADYS_PAGE.readFirst).toBeUndefined();
  });

  it("is offered three times: above the first WhatsApp button, in the closing section and above the form", () => {
    const src = stripComments(PAGE);
    const at = [...src.matchAll(/<ReadFirstNotice /g)].map(m => m.index!);
    expect(at).toHaveLength(3);
    expect(at[0]).toBeLessThan(src.indexOf("heroCtaRef.current = el"));
    expect(src.slice(at[1], at[1] + 120)).toContain('tone="dark"');
    expect(at[1]).toBeGreaterThan(src.indexOf("{READY_HEADING}"));
    expect(at[2]).toBeLessThan(src.indexOf('<PipedriveForm content={content} id="advisor-form" />'));
    expect(at[2]).toBeGreaterThan(src.indexOf('id="send-details"'));
  });

  it("opens only when the visitor presses a button, never by itself", () => {
    const src = stripComments(COMPONENT);
    expect(src).toContain("const [open, setOpen] = useState(false);");
    expect(src).not.toMatch(/useEffect|setTimeout|sessionStorage|localStorage/);
    expect(src.match(/setOpen\(true\)/g)).toHaveLength(1);
    expect(src).toContain("onClick={() => show(i)}");
  });
});

describe("Tim Hunt's text, in both languages", () => {
  it("has English first, then Chichewa, each marked as its language", () => {
    expect(N.versions.map(v => [v.language, v.lang])).toEqual([["English", "en-GB"], ["Chichewa", "ny"]]);
    expect(stripComments(COMPONENT)).toContain("lang={version.lang}");
  });

  it("carries his headings", () => {
    expect(EN.heading).toBe("Please read this before contacting Madalitso");
    expect(NY.heading.toUpperCase()).toBe("CHONDE WERENGANI IZI MUSANALAKHULANE NDI MADALITSO");
    expect(NY.signOff).toBe("ZIKOMO");
  });

  it("has the same nine points in each, with the Hungary and Cyprus costs at point 5", () => {
    for (const v of N.versions) {
      expect(v.points).toHaveLength(9);
      expect(v.points.map((p, i) => (p.costs ? i + 1 : 0)).filter(Boolean)).toEqual([5]);
      expect(v.points[4].costs).toHaveLength(3);
    }
  });

  it("says the four things Tim wants every enquirer to know", () => {
    expect(EN.points[0].body).toContain("We do not provide full scholarships");
    expect(EN.points[5].body).toContain("We do not offer overseas jobs");
    expect(EN.points[7].body).toContain("only if you have sufficient funds");
    expect(EN.points[8].body).toContain("please do not submit an enquiry");
  });

  it("promises no job: the Graduate visa line says it does not guarantee employment", () => {
    expect(EN.points[3].body).toContain("It does not guarantee employment, and the rules may change before you graduate.");
  });

  it("uses no em dash", () => {
    for (const v of N.versions) {
      expect([v.heading, v.intro, ...allLines(v), v.closing, v.note].join(" ")).not.toContain("—");
    }
  });
});

describe("the figures", () => {
  it("states the same rate in both languages", () => {
    for (const v of N.versions) expect(v.note).toContain("£1 ≈ MK2,325");
  });

  it("gives every kwacha amount as the pound amount at that rate, to one decimal place in millions", () => {
    let checked = 0;
    for (const v of N.versions) {
      for (const line of allLines(v)) {
        const mk = kwachaMillions(line);
        const gbp = pounds(line).slice(-mk.length);
        mk.forEach((m, i) => {
          expect(Math.round((gbp[i] * RATE) / 100_000) / 10, `${v.language}: ${line}`).toBe(m);
          checked++;
        });
      }
    }
    expect(checked).toBe(2 * 8);
  });

  it("carries identical figures in English and Chichewa", () => {
    const figures = (v: typeof EN) => allLines(v).flatMap(l => [...l.matchAll(/(£[\d,]+|MK[\d.]+)/g)].map(m => m[1]));
    expect(figures(NY)).toEqual(figures(EN));
  });

  it("adds up: fees plus living costs make each total", () => {
    expect(pounds(EN.points[1].body)).toEqual([15_000, 11_000, 26_000]);
    const [fees, living, total] = EN.points[4].costs!.map(pounds);
    expect(total).toEqual([fees[0] + living[0], fees[1] + living[1]]);
  });
});
