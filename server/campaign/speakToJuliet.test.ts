import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import {
  AVAILABILITY_NOTE,
  DESTINATIONS_LINE,
  FORM_STUDY_OPTIONS,
  GLENICE,
  GLENICE_QUOTE,
  HELP_ME_DECIDE,
  HERO,
  JULIET,
  JULIET_VIDEO,
  STEPS,
  STUDY_FAMILIES,
  UNSUPPORTED_ENQUIRY_ROUTES,
  WHATSAPP_FIRST_MESSAGE,
  whatsappHref,
} from "../../client/src/lib/speakToJuliet";
import {
  DESIRED_LEVEL_VALUES,
  DESTINATION_VALUES,
  isDesiredLevelValue,
} from "../../shared/studentEnquiryOptions";
import { CANONICAL_PATHS, NOINDEX_PATHS, SEO_MAP, getCanonicalPath, shouldNoindex } from "../../shared/seo";
import { VALID_CLIENT_ROUTES, isValidClientRoute } from "../../shared/routes";
import { ALL_PRERENDER_ROUTES } from "../../shared/prerenderRoutes";

/**
 * Speak to Juliet, the Nigeria landing page built 19 September 2026 to Tom
 * Arrington's implementation brief.
 *
 * What these tests hold, in order of how much damage the failure would do:
 * the page creates no lead of its own, it offers only enquiry values the CRM
 * can record, WhatsApp opens the right number with the right message, the
 * alias redirects to one canonical URL, and no claim appears that WSA cannot
 * evidence.
 */

const PAGE_SOURCE = readFileSync("client/src/pages/SpeakToJuliet.tsx", "utf8");

/**
 * Comments are not shipped code, and a comment that explains why a thing is
 * absent naturally names the thing. Stripped before any check that asks what
 * the page actually does, the same way server/siteCopy.test.ts does it.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const PAGE_CODE = stripComments(PAGE_SOURCE);
const LIB_CODE = stripComments(readFileSync("client/src/lib/speakToJuliet.ts", "utf8"));

describe("the page creates no lead of its own", () => {
  it("hands the student's answers to the controlled signup and calls no CRM directly", () => {
    // The one controlled path into Pipedrive, the same hop the Nigeria
    // postgraduate page makes.
    expect(PAGE_SOURCE).toContain('window.location.assign(`/contact?${params.toString()}#student-signup`)');
  });

  it("never posts to an API, a CRM or anything else from this page", () => {
    for (const forbidden of ["fetch(", "XMLHttpRequest", "pipedrive", "useMutation", "trpc."]) {
      expect(PAGE_CODE.toLowerCase(), `page code must not contain ${forbidden}`).not.toContain(forbidden.toLowerCase());
    }
  });

  it("carries only the five prefill keys the signup form reads", () => {
    const keys = [...PAGE_SOURCE.matchAll(/params\.set\("([a-zA-Z]+)"/g)].map(m => m[1]);
    expect(new Set(keys)).toEqual(new Set(["firstName", "email", "phone", "desiredLevel", "preferredDestination"]));
  });

  it("asks for neither funding nor family name at first contact", () => {
    for (const absent of ["educationFunding", "lastName", "familyName", "scholarship"]) {
      expect(PAGE_SOURCE).not.toContain(absent);
    }
  });
});

describe("the form offers only enquiry values the CRM can record", () => {
  it("every study option is a controlled value", () => {
    for (const option of FORM_STUDY_OPTIONS) {
      expect(isDesiredLevelValue(option.value), `${option.value} is not a controlled value`).toBe(true);
      expect(DESIRED_LEVEL_VALUES).toContain(option.value);
    }
  });

  it("no two options record the same value, so the distinction survives into the CRM", () => {
    const values = FORM_STUDY_OPTIONS.map(o => o.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("the undecided destination is the controlled 'multiple', offered as Help me decide", () => {
    expect(DESTINATION_VALUES).toContain(HELP_ME_DECIDE);
    expect(PAGE_SOURCE).toContain('<option value={HELP_ME_DECIDE}>Help me decide</option>');
    expect(PAGE_SOURCE).not.toContain('>Other<');
  });

  it("names the three routes with no controlled value, and offers none of them as a study option", () => {
    expect(UNSUPPORTED_ENQUIRY_ROUTES).toHaveLength(3);
    const labels = FORM_STUDY_OPTIONS.map(o => o.label.toLowerCase());
    for (const route of ["football", "summer", "online"]) {
      expect(labels.some(l => l.includes(route)), `${route} must not be a study option`).toBe(false);
    }
  });

  it("keeps those three visible in the page copy, so they are not silently dropped", () => {
    const copy = STUDY_FAMILIES.map(f => `${f.title} ${f.body}`).join(" ").toLowerCase();
    expect(copy).toContain("football");
    expect(copy).toContain("summer");
    expect(copy).toContain("online");
  });

  it("the catch-all is labelled as a catch-all and claims nothing in particular", () => {
    const other = FORM_STUDY_OPTIONS.find(o => o.value === "other");
    expect(other?.label).toBe("Something else");
  });
});

describe("WhatsApp, the primary action", () => {
  it("builds Juliet's link with her number and the first message already written", () => {
    const href = whatsappHref(JULIET.whatsappDigits, WHATSAPP_FIRST_MESSAGE);
    expect(href.startsWith("https://wa.me/2348035837934?text=")).toBe(true);
    expect(decodeURIComponent(href.split("?text=")[1])).toBe(WHATSAPP_FIRST_MESSAGE);
  });

  it("the digits match the number shown on the page, with no punctuation", () => {
    expect(JULIET.whatsapp).toBe("+234 803 583 7934");
    expect(JULIET.whatsappDigits).toBe(JULIET.whatsapp.replace(/[^0-9]/g, ""));
    expect(GLENICE.whatsappDigits).toBe(GLENICE.whatsapp.replace(/[^0-9]/g, ""));
  });

  it("the first message names Juliet and says what the person wants, without promising anything", () => {
    expect(WHATSAPP_FIRST_MESSAGE).toContain("Juliet");
    expect(WHATSAPP_FIRST_MESSAGE.length).toBeLessThan(160);
  });

  it("the sticky bar is a phone-only fallback that waits for the hero button to leave", () => {
    expect(PAGE_SOURCE).toContain("IntersectionObserver");
    expect(PAGE_SOURCE).toContain("sm:hidden");
    // It must clear the phone's own home indicator.
    expect(PAGE_SOURCE).toContain("env(safe-area-inset-bottom, 0px)");
  });
});

describe("the route, the alias and the metadata", () => {
  it("serves the canonical page", () => {
    expect(isValidClientRoute("/speak-to-juliet")).toBe(true);
    expect(VALID_CLIENT_ROUTES).toContain("/speak-to-juliet");
  });

  it("redirects both spellings of Tim's short link to the canonical route", () => {
    expect(CANONICAL_PATHS["/LPJuliet"]).toBe("/speak-to-juliet");
    expect(CANONICAL_PATHS["/lpjuliet"]).toBe("/speak-to-juliet");
    expect(getCanonicalPath("/LPJuliet")).toBe("/speak-to-juliet");
  });

  it("the alias is not itself a route, so it can never render a second copy of the page", () => {
    expect(isValidClientRoute("/LPJuliet")).toBe(false);
    expect(isValidClientRoute("/lpjuliet")).toBe(false);
  });

  it("the canonical route is canonical to itself, so the redirect cannot chain", () => {
    expect(getCanonicalPath("/speak-to-juliet")).toBe("/speak-to-juliet");
    expect(CANONICAL_PATHS["/speak-to-juliet"]).toBeUndefined();
  });

  it("has its own title and description", () => {
    const seo = SEO_MAP["/speak-to-juliet"];
    expect(seo?.title).toContain("Juliet");
    expect(seo?.description).toContain("Lagos");
  });

  it("stays out of the index while the copy is provisional", () => {
    expect(NOINDEX_PATHS.has("/speak-to-juliet")).toBe(true);
    expect(shouldNoindex("/speak-to-juliet")).toBe(true);
    expect(ALL_PRERENDER_ROUTES).not.toContain("/speak-to-juliet");
  });
});

describe("what the page says", () => {
  it("leads with the headline and the primary action from the brief", () => {
    expect(HERO.headline).toBe("Thinking about studying abroad? Speak to Juliet.");
    expect(HERO.eyebrow).toBe("For the people of Nigeria");
    expect(HERO.primaryCta).toContain("WhatsApp");
  });

  it("promises no response time anywhere", () => {
    const allCopy = [
      HERO.supporting, HERO.headline, HERO.secondaryCta, DESTINATIONS_LINE, AVAILABILITY_NOTE,
      ...STEPS.map(s => `${s.title} ${s.body}`),
      ...STUDY_FAMILIES.map(f => `${f.title} ${f.body}`),
    ].join(" ").toLowerCase();
    for (const promise of ["24 hour", "24-hour", "48 hour", "within a day", "same day", "immediately"]) {
      expect(allCopy, `must not promise "${promise}"`).not.toContain(promise);
    }
  });

  it("makes no unscoped claim that WSA is free", () => {
    // The only cost statement is scoped to students working with WSA, which
    // is the wording already published on the Nigeria postgraduate page.
    expect(HERO.supporting).toContain("at no cost to students working with WSA");
    for (const unscoped of ["completely free", "free service", "always free", "free for everyone"]) {
      expect(HERO.supporting.toLowerCase()).not.toContain(unscoped);
    }
  });

  it("describes no destination in terms of work, migration or settlement", () => {
    const allCopy = [DESTINATIONS_LINE, AVAILABILITY_NOTE, ...STUDY_FAMILIES.map(f => f.body)].join(" ").toLowerCase();
    for (const banned of ["skilled", "employment", "job", "career opportunit", "migrat", "settle", "residency", "work permit", "work visa"]) {
      expect(allCopy, `must not mention "${banned}"`).not.toContain(banned);
    }
  });

  it("claims nothing about rankings, outcomes or university relationships", () => {
    const allCopy = [
      HERO.supporting, DESTINATIONS_LINE, AVAILABILITY_NOTE,
      ...STEPS.map(s => s.body), ...STUDY_FAMILIES.map(f => f.body),
    ].join(" ").toLowerCase();
    for (const banned of ["ranked", "ranking", "top 10", "success rate", "guarantee", "partner universit", "accredited"]) {
      expect(allCopy, `must not claim "${banned}"`).not.toContain(banned);
    }
  });

  it("states the availability caveat once, so no family reads as a standing offer", () => {
    expect(AVAILABILITY_NOTE.toLowerCase()).toContain("depends on");
  });
});

describe("the two people", () => {
  it("puts Juliet first and gives her the page", () => {
    expect(JULIET.name).toBe("Juliet Nnajiofor-Uyi");
    expect(JULIET.role).toBe("Higher Education Advisor");
    expect(JULIET.location).toBe("Lagos, Nigeria");
    // Her section is a full section; Glenice's is a single card.
    expect(PAGE_SOURCE.indexOf("{JULIET.name}")).toBeLessThan(PAGE_SOURCE.indexOf("{GLENICE.name}"));
  });

  it("gives Glenice her controlled role and no location line at all", () => {
    expect(GLENICE.name).toBe("Glenice Owino");
    expect(GLENICE.role).toBe("Senior Student Counsellor");
    expect(GLENICE).not.toHaveProperty("location");
    // No location reaches the page for her, under any wording.
    expect(LIB_CODE).not.toContain("Head Office");
    expect(LIB_CODE).not.toContain("Nairobi");
    expect(JSON.stringify(GLENICE)).not.toContain("Kenya");
  });

  it("quotes Glenice in her own approved words, so the page needs no fresh sign off", () => {
    const bio = readFileSync("client/src/lib/team.ts", "utf8");
    expect(bio).toContain(GLENICE_QUOTE);
  });

  it("names Glenice as the counsellor who takes the application forward", () => {
    const third = STEPS[2];
    expect(third.body).toContain("Glenice Owino");
    expect(third.body).toContain("Senior Student Counsellor");
    // And Juliet does not disappear at the handover.
    expect(third.body).toContain("Juliet");
  });

  it("Juliet's photograph is the one in the controlled team record", () => {
    const team = readFileSync("client/src/lib/team.ts", "utf8");
    expect(team).toContain(JULIET.photo);
  });
});

describe("the video", () => {
  it("is the WSA library recording of Juliet", () => {
    const library = readFileSync("client/src/lib/studentSupportLibrary.ts", "utf8");
    expect(library).toContain(JULIET_VIDEO.youtubeId);
  });

  it("never autoplays until a visitor asks for it", () => {
    // The iframe only exists in the playing branch, behind a real button.
    expect(PAGE_SOURCE).toContain("if (!playing)");
    expect(PAGE_SOURCE).toContain("onClick={() => setPlaying(true)}");
    // The one autoplay parameter is inside the src that is built only after
    // the visitor has pressed play.
    const iframeBlock = PAGE_SOURCE.slice(PAGE_SOURCE.indexOf("<iframe"));
    expect(iframeBlock).toContain("autoplay=1");
    expect(PAGE_SOURCE.indexOf("autoplay=1")).toBeGreaterThan(PAGE_SOURCE.indexOf("setPlaying(true)"));
  });
});

describe("mobile and accessibility", () => {
  it("gives every form control a label and every image real alt text", () => {
    const labels = [...PAGE_SOURCE.matchAll(/htmlFor=\{`\$\{id\}-([a-z]+)`\}/g)].map(m => m[1]);
    expect(new Set(labels)).toEqual(new Set(["first", "phone", "email", "level", "destination"]));
    expect(JULIET.photoAlt).toContain("Juliet Nnajiofor-Uyi");
    expect(GLENICE.photoAlt).toContain("Glenice Owino");
  });

  it("keeps form text at 16px so a phone does not zoom on focus", () => {
    // text-base is 1rem, and the page sets it on every input and select.
    expect(PAGE_SOURCE).toContain("text-base text-wsa-navy placeholder:text-gray-400");
    expect(PAGE_SOURCE).not.toContain("text-sm text-wsa-navy placeholder");
  });

  it("gives the tappable actions a real target size", () => {
    expect(PAGE_SOURCE).toContain("min-h-[3rem]");
    expect(PAGE_SOURCE).toContain("min-h-[2.75rem]");
  });

  it("sets width and height on the hero image, so the page does not jump while it loads", () => {
    const heroImg = PAGE_SOURCE.slice(PAGE_SOURCE.indexOf("src={JULIET.photo}"));
    expect(heroImg).toContain("width={600}");
    expect(heroImg).toContain("height={800}");
  });
});
